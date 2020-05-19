import {
	IMercuryEmitOptions,
	OnPromiseHandler,
	OnErrorHandler,
	OnConnectFunctionHandler,
	OnDisconnectFunctionHandler,
	IMercuryEventContract,
	IMercuryAdapterOnOptions
} from './types/mercuryEvents'

export abstract class MercuryAdapter<
	EventContract extends IMercuryEventContract
> {
	public abstract isConnected: boolean

	public abstract init(
		options: Record<string, any>,
		eventHandler: OnPromiseHandler<IMercuryEventContract, any, any, any>,
		errorHandler: OnErrorHandler,
		onConnect: OnConnectFunctionHandler,
		onDisconnect: OnDisconnectFunctionHandler
	): void

	public abstract on<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		options: IMercuryAdapterOnOptions<
			EventContract,
			Namespace,
			EventName,
			EventSpace
		>
	): void

	public abstract emit<
		Namespace extends keyof EventContract,
		EventName extends keyof EventContract[Namespace],
		EventSpace extends EventContract[Namespace][EventName]
	>(
		options: IMercuryEmitOptions<
			EventContract,
			Namespace,
			EventName,
			EventSpace
		>
	): void

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
