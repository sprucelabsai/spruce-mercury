import { MercuryAuth } from './auth'
import { MercurySubscriptionScope } from './subscriptions'

/** An event contract keyed by the event name which also defines the expected body and payload */
export interface IMercuryEventContract {
	[eventName: string]: {
		emitPayload?: Record<string, any>
		responsePayload?: Record<string, any>
	}
}

export type EventSpace = IMercuryEventContract[string]

/** The response from a mercury GQL call */
export interface IMercuryGQLBody<TBody = Record<string, any>> {
	data: TBody
	extensions: {
		queryCost: number
		requestMS: number
		warnings: Record<string, any>[]
	}
}

/** Options for mercury.emit() */
export interface IMercuryEmitOptions<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> {
	/** The event name to emit */
	eventName: EventName
	/** Optionally specify a unique eventId. This should be a UUID v4 */
	eventId?: string
	/** The organization id associated with the event */
	organizationId?: string | null
	/** The location id associated with the event */
	locationId?: string | null
	/** The user id associated with the event */
	userId?: string | null
	/** The event payload */
	payload?: EventSpace['emitPayload']
	/** Authenticaiton credentials */
	credentials?: MercuryAuth
}

/** Options for mercury.on() */
export interface IMercuryOnOptions<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> {
	/** Whether this handler will provide a respone to the event. */
	respond?: boolean
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
	payload?: EventSpace['emitPayload']
	responses?: EventSpace['responsePayload'][]
}

export interface ISkillOnData {
	id: string
	name: string
	slug: string
}

export interface IOnData<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> {
	/** The event name that is being triggered */
	eventName: EventName

	/** The unique id for this event */
	eventId: string

	/** The skill that sent this data */
	skill: ISkillOnData

	/** The data sent with this event */
	payload: EventSpace['responsePayload']
}

// .on Handlers
export type OnFunctionHandler<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> = (data: IOnData<EventContract, EventName, EventSpace>) => void

export type OnPromiseHandler<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> = (data: IOnData<EventContract, EventName, EventSpace>) => Promise<void>

export type OnHandleEvent<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> = (
	data: IMercuryOnOptions<EventContract, EventName, EventSpace>
) => Promise<void>

export type OnHandler<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> =
	| OnFunctionHandler<EventContract, EventName, EventSpace>
	| OnPromiseHandler<EventContract, EventName, EventSpace>

// Adapter on options
export interface IMercuryAdapterOnOptions<
	EventContract extends IMercuryEventContract,
	EventName extends keyof EventContract,
	EventSpace extends EventContract[EventName]
> extends IMercuryOnOptions<EventContract, EventName, EventSpace> {
	credentials?: MercuryAuth
}

export type OnErrorHandler = (options: {
	code: string
	data: any
}) => Promise<void>

export type OnConnectPromiseHandler = () => Promise<void>
export type OnConnectFunctionHandler = () => void
export type OnConnectHandler =
	| OnConnectPromiseHandler
	| OnConnectFunctionHandler

export type OnDisconnectPromiseHandler = () => Promise<void>
export type OnDisconnectFunctionHandler = () => void
export type OnDisconnectHandler =
	| OnDisconnectPromiseHandler
	| OnDisconnectFunctionHandler
