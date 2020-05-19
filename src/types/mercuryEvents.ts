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

export interface IMercuryGQLBody<TBody = Record<string, any>> {
	data: TBody
	extensions: {
		queryCost: number
		requestMS: number
		warnings: Record<string, any>[]
	}
}

export interface IMercuryOnOptions<
	Namespace extends keyof IMercuryEventContract,
	EventName extends keyof IMercuryEventContract[Namespace],
	EventSpace extends IMercuryEventContract[string][string]
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

export interface IMercuryAdapterOnOptions<
	EventSpace extends IMercuryEventContract[string][string]
> extends IMercuryOnOptions<EventSpace> {
	credentials?: MercuryAuth
}

export type EventSpace = IMercuryEventContract[string][string]

export type OnFunctionHandler<E extends EventSpace> = (
	data: IMercuryOnOptions<E>
) => void
export type OnPromiseHandler<
	EventSpace extends IMercuryEventContract[string][string]
> = (data: IMercuryOnOptions<EventSpace>) => Promise<void>
export type OnErrorHandler = (options: {
	code: string
	data: IMercuryOnOptions<EventSpace>
}) => Promise<void>
export type OnHandler<E extends EventSpace> =
	| OnFunctionHandler<E>
	| OnPromiseHandler<E>
export type OnConnectPromiseHandler = () => Promise<void>
export type OnConnectFunctionHandler = () => void
export type OnConnectHandler =
	| OnConnectPromiseHandler
	| OnConnectFunctionHandler

export interface IOnData {
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
	payload: Record<string, any>
}
