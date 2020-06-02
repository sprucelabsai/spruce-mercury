import {
	IMercuryEmitOptions,
	OnErrorHandler,
	OnConnectFunctionHandler,
	OnDisconnectFunctionHandler,
	IMercuryEventContract,
	IMercuryAdapterOnOptions,
	OnHandleEvent
} from './types/events.types'

export abstract class MercuryAdapter<
	EventContract extends IMercuryEventContract
> {
	public abstract isConnected: boolean

	public abstract init(
		options: Record<string, any>,
		eventHandler: OnHandleEvent<EventContract, any, any>,
		errorHandler: OnErrorHandler,
		onConnect: OnConnectFunctionHandler,
		onDisconnect: OnDisconnectFunctionHandler
	): void

	public abstract on<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		options: IMercuryAdapterOnOptions<EventContract, EventName, EventSpace>
	): void

	public abstract emit<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: IMercuryEmitOptions<EventContract, EventName, EventSpace>): void

	/** Disconnects the underlying connection */
	public abstract disconnect(): void

	/** Provides an event */
	// public abstract provide(options: {
	// 	eventName: string
	// 	handler: TMercuryEventHandler
	// 	authorize: TMercuryEventAuthorization
	// }): Promise<void>

	// public abstract emit(options: {
	// 	eventName: string
	// 	organizationId?: string | null
	// 	locationId?: string | null
	// 	userId?: string | null
	// 	payload?: Record<string, any>
	// }): void
}
