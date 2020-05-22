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
	public isConnected = true

	public init(
		options: IMercuryAdapterMockOptions,
		_eventHandler: OnHandleEvent<IMercuryEventContract, any, any>,
		_errorHandler: OnErrorHandler,
		_onConnect: OnConnectFunctionHandler,
		_onDisconnect: OnConnectFunctionHandler
	): void {
		// TODO
		log.debug('MercuryAdapterMock.init()', { options })
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
		log.debug(_options)
	}

	public disconnect() {
		this.isConnected = false
	}
}
