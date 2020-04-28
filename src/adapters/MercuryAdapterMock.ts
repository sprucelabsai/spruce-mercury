import log from '../lib/log'
import { MercuryAdapter } from '../MercuryAdapter'
import {
	TOnPromiseHandler,
	TOnConnectFunctionHandler,
	IMercuryEmitOptions,
	IMercuryAdapterOnOptions,
	TOnErrorHandler
} from '../Mercury'

export interface IMercuryAdapterMockOptions {}

export default class MercuryAdapterMock implements MercuryAdapter {
	public isConnected = false
	// private options!: IMercuryAdapterMockOptions
	// private eventHandler!: TOnPromiseHandler
	// private errorHandler!: TOnErrorHandler
	// private onConnect!: TOnConnectFunctionHandler
	// private onDisconnect!: TOnConnectFunctionHandler

	public init(
		options: IMercuryAdapterMockOptions,
		_eventHandler: TOnPromiseHandler,
		_errorHandler: TOnErrorHandler,
		_onConnect: TOnConnectFunctionHandler,
		_onDisconnect: TOnConnectFunctionHandler
	): void {
		// TODO
		log.debug('MercuryAdapterMock.init()', { options })
		// this.options = options
		// this.eventHandler = eventHandler
		// this.errorHandler = errorHandler
		// this.onConnect = onConnect
		// this.onDisconnect = onDisconnect
	}

	public on(_options: IMercuryAdapterOnOptions): void {
		// TODO
	}

	public emit(_options: IMercuryEmitOptions) {
		// TODO
	}

	public disconnect() {
		this.isConnected = false
	}
}
