import log from '../lib/log'
import { MercuryAdapter } from '../MercuryAdapter'
import {
	OnHandleEvent,
	OnConnectFunctionHandler,
	OnErrorHandler,
	IMercuryAdapterOnOptions,
	IMercuryEventContract,
	IMercuryEmitOptions
} from '../types/mercuryEvents'

export interface IMercuryAdapterMockOptions {}

export default class MercuryAdapterMock<
	EventContract extends IMercuryEventContract
> implements MercuryAdapter<EventContract> {
	public isConnected = false
	// private options!: IMercuryAdapterMockOptions
	// private eventHandler!: TOnPromiseHandler
	// private errorHandler!: TOnErrorHandler
	// private onConnect!: TOnConnectFunctionHandler
	// private onDisconnect!: TOnConnectFunctionHandler

	public init(
		options: IMercuryAdapterMockOptions,
		_eventHandler: OnHandleEvent<IMercuryEventContract, any, any>,
		_errorHandler: OnErrorHandler,
		_onConnect: OnConnectFunctionHandler,
		_onDisconnect: OnConnectFunctionHandler
	): void {
		// TODO
		log.debug('MercuryAdapterMock.init()', { options })
		// this.options = options
		// this.eventHandler = eventHandler
		// this.errorHandler = errorHandler
		// this.onConnect = onConnect
		// this.onDisconnect = onDisconnect
	}

	public on<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		_options: IMercuryAdapterOnOptions<EventContract, EventName, EventSpace>
	): void {
		// TODO
	}

	public emit<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(_options: IMercuryEmitOptions<EventContract, EventName, EventSpace>) {
		// TODO
	}

	public disconnect() {
		this.isConnected = false
	}
}
