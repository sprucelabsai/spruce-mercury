import { MercuryAuth } from './auth'
import { MercurySubscriptionScope } from './subscriptions'

export interface IMercuryEventContract {
	[namespace: string]: {
		[eventName: string]: {
			name: string
			body?: Record<string, any>
			payload?: Record<string, any>
		}
	}
}

export type EventSpace = IMercuryEventContract[string][string]

export interface IMercuryGQLBody<TBody = Record<string, any>> {
	data: TBody
	extensions: {
		queryCost: number
		requestMS: number
		warnings: Record<string, any>[]
	}
}

export interface IMercuryEmitOptions<
	EventContract extends IMercuryEventContract,
	Namespace extends keyof EventContract,
	EventName extends keyof EventContract[Namespace],
	EventSpace extends EventContract[Namespace][EventName]
> {
	namespace: Namespace
	eventName: EventName
	eventId?: string
	organizationId?: string | null
	locationId?: string | null
	userId?: string | null
	payload?: EventSpace['payload']
	credentials?: MercuryAuth
}

export interface IMercuryOnOptions<
	EventContract extends IMercuryEventContract,
	Namespace extends keyof EventContract,
	EventName extends keyof EventContract[Namespace],
	EventSpace extends EventContract[Namespace][EventName]
> {
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

export interface IOnData<TPayload = Record<string, any>> {
	/** The event name that is being triggered */
	eventName: string

	/** The unique id for this event */
	eventId: string

	/** The skill that sent this data */
	skill: {
		id: string
		name: string
		slug: string
	}

	/** The data sent with this event */
	payload: TPayload
}

// .on Handlers
export type OnFunctionHandler<E extends EventSpace> = (
	data: IOnData<E['payload']>
) => void
export type OnPromiseHandler<E extends EventSpace> = (
	data: IOnData<E['payload']>
) => Promise<void>

export type OnHandler<E extends EventSpace> =
	| OnFunctionHandler<E>
	| OnPromiseHandler<E>

// Adapter on options
export interface IMercuryAdapterOnOptions<
	EventSpace extends IMercuryEventContract[string][string]
> extends IMercuryOnOptions<EventSpace> {
	credentials?: MercuryAuth
}

export type OnErrorHandler = (options: {
	code: string
	data: IMercuryOnOptions<EventSpace>
}) => Promise<void>

export type OnConnectPromiseHandler = () => Promise<void>
export type OnConnectFunctionHandler = () => void
export type OnConnectHandler =
	| OnConnectPromiseHandler
	| OnConnectFunctionHandler
