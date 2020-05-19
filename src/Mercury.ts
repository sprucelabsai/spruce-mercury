import MercuryAdapterMock from './adapters/MercuryAdapterMock'
import MercuryAdapterSocketIO from './adapters/MercuryAdapterSocketIO'
import log from './lib/log'
import { MercuryAdapter } from './MercuryAdapter'
import { MercuryAuth } from './types/auth'
import {
	IMercuryOnOptions,
	IMercuryEmitOptions,
	IMercuryEventContract,
	OnHandler,
	OnConnectHandler
} from './types/mercuryEvents'
import { MercurySubscriptionScope } from './types/subscriptions'

export enum MercuryAdapterKind {
	// eslint-disable-next-line spruce/prefer-pascal-case-enums
	SocketIO = 'socketio',
	Mock = 'mock'
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

	/** When set to true, a mock instance of mercury that does not connect to a real api is used. Use this option in your unit tests. */
	useMock?: boolean
}

interface IEventHandlers {
	[eventName: string]: {
		// TODO: Can these be strongly typed?
		onFinished: OnHandler<any>[]
		onError: OnHandler<any>[]
		onResponse: OnHandler<any>[]
	}
}

export class Mercury<EventContract extends IMercuryEventContract> {
	public logLevel = 'warn'
	public connectionOptions?: IMercuryConnectOptions
	public get isConnected(): boolean {
		if (this.adapter) {
			return this.adapter.isConnected
		}
		return false
	}
	private clientOnConnect?: OnConnectHandler
	private clientOnDisconnect?: OnConnectHandler
	private adapter?: MercuryAdapter
	private eventHandlers: IEventHandlers = {}
	private credentials?: MercuryAuth

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
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		options: IMercuryOnOptions<EventContract, Namespace, EventName, EventSpace>,
		handler: OnHandler<EventSpace>
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
	// public async emit<TPayload = Record<string, any>, TBody = any>(
	// 	options: IMercuryEmitOptions<TPayload>,
	// 	handler?: OnHandler
	// ): Promise<{
	// 	responses: {
	// 		payload: TBody
	// 	}[]
	// }> {

	public async emit<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		// options: {
		// 	namespace: Namespace
		// 	eventName: EventName
		// 	eventId?: string
		// 	organizationId?: string | null
		// 	locationId?: string | null
		// 	userId?: string | null
		// 	payload?: EventSpace['payload']
		// 	credentials?: MercuryAuth
		// },
		options: IMercuryEmitOptions<
			EventContract,
			Namespace,
			EventName,
			EventSpace
		>,
		handler?: OnHandler<EventSpace>
	): Promise<{
		responses: {
			payload: EventSpace['body']
		}[]
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

	/** Waits for the connection up to a certain timeout */
	private awaitConnection(timeoutMS?: number): Promise<void> {
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

	private waitConnection(options: {
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

	private emitOnFinishedCallback(eventId: string): Promise<any> {
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

	private setAdapter(options: {
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
			case MercuryAdapterKind.Mock:
				this.adapter = new MercuryAdapterMock()
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

	/** Used for keepting track of callbacks in this.eventHandlers */
	private getEventHandlerKey<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		options: IMercuryOnOptions<EventContract, Namespace, EventName, EventSpace>
	): string {
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
	private getPossibleEventHandlerKeys<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		options: IMercuryOnOptions<EventContract, Namespace, EventName, EventSpace>
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
	private async getAdapterOptions(
		options: IMercuryConnectOptions
	): Promise<{
		adapter: MercuryAdapterKind
		connectionOptions: Record<string, any>
	}> {
		const { spruceApiUrl, credentials, useMock } = options

		// In the future if we have multiple adapters we could call the api to determine the type of adapter to use
		// const response = await request
		// 	.post(`${spruceApiUrl}/api/2.0/mercury/connect`)
		// 	.send(credentials)
		// return response.body

		return {
			adapter: useMock ? MercuryAdapterKind.Mock : MercuryAdapterKind.SocketIO,
			connectionOptions: {
				socketIOUrl: spruceApiUrl,
				...credentials
			}
		}
	}

	/** Called when the adapter detects an event. This function then looks to see if there are any callbacks for that event to invoke */
	private async handleEvent<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		options: IMercuryOnOptions<EventContract, Namespace, EventName, EventSpace>
	) {
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
	private async handleError<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(options: {
		code: string
		data: {
			/** Whether this handler will provide a respone to the event. */
			respond?: boolean
			/** The event namespace */
			namespace: Namespace
			/** The event to subscribe to */
			eventName: EventName
			/** The scope of the data to get back */
			scope: MercurySubscriptionScope
			/** A custom UUID for this event. If not provided, one will be generated */
			eventId?: string
			/** The organization id where the event is triggered */
			organizationId?: string | null
			/** The location id where the event is triggered. If passed, organizationId should also be set. */
			locationId?: string | null
			/** The user id who is triggering this event */
			userId?: string | null
			payload?: EventSpace['payload']
			responses?: EventSpace['body'][]
		}
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
	private executeErrorHandler<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(handler: OnHandler<EventSpace>, code: string) {
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
	private executeHandler<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(handler: OnHandler<EventSpace>, data?: any) {
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
	private onConnect() {
		log.debug('Mercury: onConnect')
		if (this.clientOnConnect) {
			this.executeHandler(this.clientOnConnect)
		}
	}

	private onDisconnect() {
		log.debug('Mercury: onDisconnect')
		// Clear event handlers
		this.eventHandlers = {}

		if (this.clientOnDisconnect) {
			this.executeHandler(this.clientOnDisconnect)
		}
	}

	/** UUID v4 generator (from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript) */
	private uuid() {
		// @ts-ignore
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = (Math.random() * 16) | 0,
				v = c == 'x' ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})
	}
}
