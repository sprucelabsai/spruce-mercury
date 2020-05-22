import MercuryAdapterSocketIO from './adapters/MercuryAdapterSocketIO'
import log from './lib/log'
import { MercuryAdapter } from './MercuryAdapter'
import { MercuryAuth } from './types/auth'
import {
	IMercuryOnOptions,
	IMercuryEmitOptions,
	IMercuryEventContract,
	OnHandler,
	OnConnectHandler,
	IOnData
} from './types/mercuryEvents'

export enum MercuryAdapterKind {
	// eslint-disable-next-line spruce/prefer-pascal-case-enums
	SocketIO = 'socketio'
}

export interface IMercuryError {}

export interface IMercuryConnectOptions {
	/** The URL for the Spruce API */
	spruceApiUrl: string

	/** Your connection credentials to connect as either a User or a Skill */
	credentials?: MercuryAuth

	/**
	 * Callback function to execute when Mercury has connected.
	 * You should set up your event listeners mercury.on(...) in the onConnect callback
	 *
	 * This function will also be called in case of a reconnect
	 */
	onConnect?: OnConnectHandler

	/**
	 * Callback function to execute when Mercury has disconnected.
	 *
	 * This callback usually doesn't need to be implemented.
	 * Mercury will handle cleanup of callback functions created in onConnect
	 */
	onDisconnect?: OnConnectHandler
}

interface IEventHandlers<
	EventContract extends IMercuryEventContract = IMercuryEventContract,
	EventName extends keyof EventContract = any,
	EventSpace extends EventContract[EventName] = any
> {
	[eventName: string]: {
		// TODO: Can these be strongly typed?
		onFinished: OnHandler<EventContract, EventName, EventSpace>[]
		onError: OnHandler<EventContract, EventName, EventSpace>[]
		onResponse: OnHandler<EventContract, EventName, EventSpace>[]
	}
}

export default class Mercury<EventContract extends IMercuryEventContract> {
	public logLevel = 'warn'
	public connectionOptions?: IMercuryConnectOptions
	public get isConnected(): boolean {
		if (this.adapter) {
			return this.adapter.isConnected
		}
		return false
	}
	protected clientOnConnect?: OnConnectHandler
	protected clientOnDisconnect?: OnConnectHandler
	protected adapter?: MercuryAdapter<EventContract>
	protected eventHandlers: IEventHandlers = {}
	protected credentials?: MercuryAuth

	public constructor(options?: IMercuryConnectOptions) {
		if (!options) {
			return
		}
		this.connect(options)
			.then(() => {
				log.debug('Mercury connect finished')
			})
			.catch(e => {
				log.warn(e)
			})
	}

	/** Connects Mercury. Calling this method directly  */
	public async connect(options: IMercuryConnectOptions): Promise<void> {
		const { onConnect, onDisconnect, credentials } = options

		this.connectionOptions = options
		this.clientOnConnect = onConnect
		this.clientOnDisconnect = onDisconnect
		this.credentials = credentials

		const adapterOptions = await this.getAdapterOptions(options)
		this.setAdapter(adapterOptions)
	}

	/** Subscribe to events */
	public on<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		options: IMercuryOnOptions<EventContract, EventName, EventSpace>,
		handler: OnHandler<EventContract, EventName, EventSpace>
	): void {
		if (!this.adapter) {
			log.debug('Mercury: Unable to set .on() event because no adapter is set')
			// Retry setting the subscription
			setTimeout(() => this.on(options, handler), 500)
			return
		}

		try {
			const key = this.getEventHandlerKey(options)
			if (!this.eventHandlers[key]) {
				this.eventHandlers[key] = {
					onFinished: [],
					onError: [],
					onResponse: []
				}
			}
			this.eventHandlers[key].onResponse.push(handler)

			this.adapter.on({
				...options,
				credentials: this.credentials
			})
		} catch (e) {
			log.warn(e)
		}
	}

	/** Emit an event and set handler for responses */
	public async emit<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		options: IMercuryEmitOptions<EventContract, EventName, EventSpace>,
		handler?: OnHandler<EventContract, EventName, EventSpace>
	): Promise<{
		// TODO: Better typing on this response
		responses: IOnData<EventContract, EventName, EventSpace>[]
	}> {
		await this.awaitConnection()

		if (!this.adapter) {
			log.warn('Mercury: Unable to emit because adapter is not set.')
			// @ts-ignore
			return
		}

		const eventId = options.eventId ?? this.uuid()
		if (!this.eventHandlers[eventId]) {
			this.eventHandlers[eventId] = {
				onFinished: [],
				onError: [],
				onResponse: []
			}
		}
		if (handler) {
			this.eventHandlers[eventId].onResponse = [handler]
		}
		this.adapter.emit({
			...options,
			eventId,
			credentials: this.credentials
		})

		return this.emitOnFinishedCallback(eventId)
	}

	protected setAdapter(options: {
		adapter: MercuryAdapterKind
		connectionOptions: Record<string, any>
	}): boolean {
		const { adapter, connectionOptions } = options
		log.debug('setAdapter', { options })

		if (this.adapter) {
			this.adapter.disconnect()
			this.adapter = undefined
		}

		// TODO: Globby the adapters directory and set the correct one when we have multiple
		let isAdapterSet = false
		switch (adapter) {
			case MercuryAdapterKind.SocketIO:
				this.adapter = new MercuryAdapterSocketIO()
				this.adapter.init(
					connectionOptions,
					this.handleEvent.bind(this),
					this.handleError.bind(this),
					this.onConnect.bind(this),
					this.onDisconnect.bind(this)
				)
				isAdapterSet = true
				break
			default:
				break
		}

		return isAdapterSet
	}

	/** Waits for the connection up to a certain timeout */
	protected awaitConnection(timeoutMS?: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const ms = timeoutMS || 5000
			this.waitConnection({
				timeoutMS: ms,
				cb: (e?: Error) => {
					if (e) {
						reject(e)
					} else {
						resolve()
					}
					return
				}
			})
		})
	}

	protected waitConnection(options: {
		cb: (e?: Error) => void
		timeoutMS: number
		intervalMS?: number
		retryAttempt?: number
	}) {
		const { cb, timeoutMS = 5000, intervalMS = 100, retryAttempt = 0 } = options

		if (this.isConnected) {
			cb()
			return
		}

		const timeElapsed = intervalMS * retryAttempt

		if (timeElapsed >= timeoutMS) {
			cb(new Error('MERCURY_CONNECTION_TIMEOUT'))
			return
		}

		setTimeout(() => {
			this.waitConnection({
				...options,
				retryAttempt: retryAttempt + 1
			})
		}, intervalMS)
	}

	protected emitOnFinishedCallback(eventId: string): Promise<any> {
		let onFinishedHandler
		let onErrorHandler
		const promise = new Promise((resolve, reject) => {
			onFinishedHandler = resolve
			onErrorHandler = reject
		})

		if (!this.eventHandlers[eventId]) {
			this.eventHandlers[eventId] = {
				onFinished: [],
				onError: [],
				onResponse: []
			}
		}
		if (onFinishedHandler) {
			this.eventHandlers[eventId].onFinished.push(onFinishedHandler)
		}
		if (onErrorHandler) {
			this.eventHandlers[eventId].onError.push(onErrorHandler)
		}

		return promise
	}

	/** Used for keepting track of callbacks in this.eventHandlers */
	protected getEventHandlerKey<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: IMercuryOnOptions<EventContract, EventName, EventSpace>): string {
		const { eventName, organizationId, locationId, userId } = options

		let key = `events-${eventName}`

		if (organizationId) {
			key += `-organizations-${organizationId}`
		}
		if (locationId) {
			key += `-locations-${locationId}`
		}
		if (userId) {
			key += `-users-${userId}`
		}

		return key
	}

	/** Used for determining which callbacks to execute from this.eventHandlers */
	protected getPossibleEventHandlerKeys<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		options: IMercuryOnOptions<EventContract, EventName, EventSpace>
	): string[] {
		const { eventName, userId, locationId, organizationId } = options
		const base = `events-${eventName}`
		const possibleHandlerKeys: string[] = []
		let orgKey: string | null = null
		let locationKey: string | null = null

		// Base event
		possibleHandlerKeys.push(base)

		if (organizationId) {
			orgKey = `organizations-${organizationId}`
			possibleHandlerKeys.push(`${base}-${orgKey}`)
		}
		if (locationId && orgKey) {
			locationKey = `locations-${locationId}`
			possibleHandlerKeys.push(`${base}-${orgKey}-${locationKey}`)
		}
		if (userId) {
			const userKey = `users-${userId}`
			possibleHandlerKeys.push(`${base}-${userKey}`)
		}

		return possibleHandlerKeys
	}

	/** Sends the authentication credentials to the API and gets back the adapter details to use for connecting */
	protected async getAdapterOptions(
		options: IMercuryConnectOptions
	): Promise<{
		adapter: MercuryAdapterKind
		connectionOptions: Record<string, any>
	}> {
		const { spruceApiUrl, credentials } = options

		// In the future if we have multiple adapters we could call the api to determine the type of adapter to use
		// const response = await request
		// 	.post(`${spruceApiUrl}/api/2.0/mercury/connect`)
		// 	.send(credentials)
		// return response.body

		return {
			adapter: MercuryAdapterKind.SocketIO,
			connectionOptions: {
				socketIOUrl: spruceApiUrl,
				...credentials
			}
		}
	}

	/** Called when the adapter detects an event. This function then looks to see if there are any callbacks for that event to invoke */
	protected async handleEvent<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: IMercuryOnOptions<EventContract, EventName, EventSpace>) {
		log.debug('*** Mercury.handleEvent')
		log.debug('Mercury: handleEvent', {
			options
		})

		const eventId = options && options.eventId
		const eventName = options && options.eventName

		log.debug({ eventHandlers: this.eventHandlers })

		// Check if there is a callback for this eventId
		if (
			eventId &&
			options.responses &&
			this.eventHandlers[eventId] &&
			this.eventHandlers[eventId].onFinished
		) {
			log.debug('Event finished. Calling event handlers', {
				onFinished: this.eventHandlers[eventId].onFinished
			})
			this.eventHandlers[eventId].onFinished.forEach(handler => {
				this.executeHandler(handler, options)
			})
		} else if (
			eventId &&
			this.eventHandlers[eventId] &&
			this.eventHandlers[eventId].onResponse
		) {
			this.eventHandlers[eventId].onResponse.forEach(handler => {
				this.executeHandler(handler, options)
			})
		}

		if (eventName) {
			const possibleHandlerKeys = this.getPossibleEventHandlerKeys(options)
			possibleHandlerKeys.forEach(key => {
				if (this.eventHandlers[key] && this.eventHandlers[key].onResponse) {
					this.eventHandlers[key].onResponse.forEach(handler => {
						this.executeHandler(handler, options)
					})
				}
			})
		}
	}

	/** Called when the adapter detects an error */
	protected async handleError<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: {
		code: string
		data: IOnData<EventContract, EventName, EventSpace>
	}) {
		const { code, data } = options
		log.debug('*** Mercury.handleError')
		log.debug('Mercury: handleError', {
			options
		})

		const eventId = data && data.eventId

		log.debug({ eventHandlers: this.eventHandlers, code, data })

		// Check if there is a callback for this eventId
		if (
			eventId &&
			this.eventHandlers[eventId] &&
			this.eventHandlers[eventId].onError
		) {
			log.debug('Event finished. Calling event error handlers', {
				onError: this.eventHandlers[eventId].onError
			})
			this.eventHandlers[eventId].onError.forEach(handler => {
				this.executeErrorHandler(handler, code)
			})
		}
	}

	/** Executes either a function or promise callback by detecting the type */
	protected executeErrorHandler<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(handler: OnHandler<EventContract, EventName, EventSpace>, code: string) {
		// Check if the handler is a promise
		const objToCheck = handler as any

		if (objToCheck && typeof objToCheck === 'function') {
			try {
				objToCheck(new Error(code))
				log.debug('Mercury: Executed function callback')
			} catch (e) {
				log.warn('Mercury: Error executing function callback', e)
			}
		} else {
			log.warn(
				'Mercury: Unable to execute error callback for event because Handler is not a promise or function',
				objToCheck
			)
		}
	}

	/** Executes either a function or promise callback by detecting the type */
	protected executeHandler<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(handler: OnHandler<EventContract, EventName, EventSpace>, data?: any) {
		// Check if the handler is a promise
		const objToCheck = handler as any

		if (objToCheck && typeof objToCheck.then === 'function') {
			objToCheck(data)
				.then(() => {
					log.debug('Mercury: Executed promise callback')
				})
				.catch((e: Error) => {
					log.warn('Mercury: Error executing promise callback', e)
				})
		} else if (objToCheck && typeof objToCheck === 'function') {
			try {
				objToCheck(data)
				log.debug('Mercury: Executed function callback')
			} catch (e) {
				log.warn('Mercury: Error executing function callback', e)
			}
		} else {
			log.warn(
				'Mercury: Unable to execute callback for event because Handler is not a promise or function',
				objToCheck
			)
		}
	}

	/** Called when the adapter connects */
	protected onConnect() {
		log.debug('Mercury: onConnect')
		if (this.clientOnConnect) {
			this.executeHandler(this.clientOnConnect)
		}
	}

	protected onDisconnect() {
		log.debug('Mercury: onDisconnect')
		// Clear event handlers
		this.eventHandlers = {}

		if (this.clientOnDisconnect) {
			this.executeHandler(this.clientOnDisconnect)
		}
	}

	/** UUID v4 generator (from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript) */
	protected uuid() {
		// @ts-ignore
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = (Math.random() * 16) | 0,
				v = c == 'x' ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})
	}
}
