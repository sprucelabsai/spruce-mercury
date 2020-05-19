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
	EventSpace extends IMercuryEventContract[string][string]
> {
	/** Whether this handler will provide a respone to the event. */
	respond?: boolean
	/** The event to subscribe to */
	eventName: EventSpace['name']
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

export type TOnFunctionHandler<E extends EventSpace> = (
	data: IMercuryOnOptions<E>
) => void
export type TOnPromiseHandler<
	EventSpace extends IMercuryEventContract[string][string]
> = (data: IMercuryOnOptions<EventSpace>) => Promise<void>
export type TOnErrorHandler = (options: {
	code: string
	data: IMercuryOnOptions<EventSpace>
}) => Promise<void>
export type TOnHandler<E extends EventSpace> =
	| TOnFunctionHandler<E>
	| TOnPromiseHandler<E>
export type TOnConnectPromiseHandler = () => Promise<void>
export type TOnConnectFunctionHandler = () => void
export type TOnConnectHandler =
	| TOnConnectPromiseHandler
	| TOnConnectFunctionHandler