/* eslint-disable import/order */
import log from '../lib/log'
import { MercuryAdapter } from '../MercuryAdapter'
import {
	OnPromiseHandler,
	OnConnectFunctionHandler,
	OnErrorHandler,
	IMercuryAdapterOnOptions,
	IMercuryEventContract,
	IMercuryEmitOptions
} from '../types/mercuryEvents'

// Import correct version depending on whether we're in browser or node.
// Fun gotcha: We can't use require() syntax in browser or it won't compile properly
let Socket: any
// @ts-ignore
import s from 'socket.io-client/dist/socket.io.js'
Socket = s

if (typeof window === 'undefined') {
	Socket = require('socket.io-client')
}

export interface IMercuryAdapterSocketIOOptions {
	socketIOUrl: string
}

export default class MercuryAdapterSocketIO<
	EventContract extends IMercuryEventContract
> implements MercuryAdapter<EventContract> {
	public isConnected = false
	private socket?: any
	private options!: IMercuryAdapterSocketIOOptions
	private eventHandler!: OnPromiseHandler<IMercuryEventContract, any, any>
	private errorHandler!: OnErrorHandler
	private onConnect!: OnConnectFunctionHandler
	private onDisconnect!: OnConnectFunctionHandler

	public init(
		options: IMercuryAdapterSocketIOOptions,
		eventHandler: OnPromiseHandler<IMercuryEventContract, any, any>,
		errorHandler: OnErrorHandler,
		onConnect: OnConnectFunctionHandler,
		onDisconnect: OnConnectFunctionHandler
	): void {
		log.debug({ options })
		this.options = options
		this.eventHandler = eventHandler
		this.errorHandler = errorHandler
		this.onConnect = onConnect
		this.onDisconnect = onDisconnect
		this.connect()
	}

	public on<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		options: IMercuryAdapterOnOptions<EventContract, EventName, EventSpace>
	): void {
		if (this.isConnected) {
			this.socket.emit('subscribe', options)
		} else {
			log.debug(
				'Mercury SocketIO: Unable to set .on() event because adapter is not connected'
			)
			// If we're not connected, we should just retry shortly
			// TODO: Set some kind of final timeout here?
			setTimeout(() => this.on(options), 500)
		}
	}

	public emit<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: IMercuryEmitOptions<EventContract, EventName, EventSpace>) {
		if (!this.socket) {
			log.warn('Can not emit. SocketIO not connected.')
			return
		}
		this.socket.emit('mercury-emit', options)
	}

	public disconnect() {
		if (!this.socket) {
			log.warn('Can not disconnect. SocketIO not connected.')
			return
		}

		this.socket.disconnect(true)
	}

	private connect() {
		this.socket = Socket(this.options.socketIOUrl, {
			path: '/mercury',
			transports: ['websocket', 'polling'],
			rejectUnauthorized: false
		})
		this.setupCoreEventHandlers()
	}

	private setupCoreEventHandlers() {
		if (!this.socket) {
			log.warn('Can not set event handlers. SocketIO not connected.')
			return
		}
		this.socket.on('connect', () => {
			log.debug('SOCKET CONNECT')
			this.isConnected = true
			this.onConnect()
		})
		this.socket.on('disconnect', () => {
			log.debug('SOCKET DISCONNECT')
			this.isConnected = false
			this.onDisconnect()
		})

		this.socket.on('err', async (options: { code: string; data: any }) => {
			const { code, data } = options
			log.warn('Socket error', data)
			try {
				await this.errorHandler({ code, data })
			} catch (e) {
				log.warn(e)
			}
		})

		this.socket.on('mercury-event', async (data: any) => {
			try {
				await this.eventHandler(data)
			} catch (e) {
				log.warn(e)
			}
		})
	}
}
