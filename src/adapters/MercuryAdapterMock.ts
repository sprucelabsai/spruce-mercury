import faker from 'faker'
import log from '../lib/log'
import uuid from '../lib/uuid'
import { MercuryAdapter } from '../MercuryAdapter'
import {
	OnHandleEvent,
	OnConnectFunctionHandler,
	OnErrorHandler,
	IMercuryAdapterOnOptions,
	IMercuryEventContract,
	IMercuryEmitOptions,
	IEventResponse,
	ISkillOnData
} from '../types/events.types'
import { MercurySubscriptionScope } from '../types/subscriptions.types'

export interface IMercuryAdapterMockOptions {}

interface IMockEmitResponses {
	[eventName: string]: {
		[skillId: string]: Omit<IEventResponse<any, any, any>, 'eventId'>
	}
}

export default class MercuryAdapterMock<
	EventContract extends IMercuryEventContract
> implements MercuryAdapter<EventContract> {
	public isConnected = true

	private eventHandler!: OnHandleEvent<IMercuryEventContract, any, any>
	private mockEmitResponses: IMockEmitResponses = {}

	public init(
		options: IMercuryAdapterMockOptions,
		eventHandler: OnHandleEvent<IMercuryEventContract, any, any>,
		_errorHandler: OnErrorHandler,
		_onConnect: OnConnectFunctionHandler,
		_onDisconnect: OnConnectFunctionHandler
	): void {
		// TODO
		log.debug('MercuryAdapterMock.init()', { options })
		// this.options = options
		this.eventHandler = eventHandler
	}

	public on<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		_options: IMercuryAdapterOnOptions<EventContract, EventName, EventSpace>
	): void {
		// TODO
	}

	/** Emit an event and set handler for responses */
	public emit<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: IMercuryEmitOptions<EventContract, EventName, EventSpace>) {
		const { eventName, eventId } = options

		process.nextTick(async () => {
			try {
				const responses = this.getMockResponsesForEvent({
					eventName,
					eventId: eventId ?? uuid()
				})

				if (responses.length > 0) {
					const promises = responses.map(r => {
						return this.eventHandler({
							...r,
							// TODO: set / control subscription scope
							scope: MercurySubscriptionScope.Location,
							eventId,
							responses
						})
					})

					// Execute individual event handlers for each
					await Promise.all(promises)

					// Execute the final callback
					await this.eventHandler({
						eventName,
						// TODO: set / control subscription scope
						scope: MercurySubscriptionScope.Location,
						eventId,
						organizationId: responses[0].organizationId,
						locationId: responses[0].locationId,
						userId: responses[0].userId,
						payload: responses[0].payload,
						responses
					})
				}
			} catch (e) {
				log.warn(e)
			}
		})
	}

	public disconnect() {
		this.isConnected = false
	}

	/** Sets the response to an emit */
	public setMockResponse<
		EventName extends keyof EventContract,
		ResponsePayload extends EventContract[EventName]['responsePayload']
	>(options: {
		eventName: EventName
		payload: ResponsePayload
		skill?: ISkillOnData
	}) {
		const { eventName, payload } = options
		const eventNameStr = eventName as string

		if (!this.mockEmitResponses[eventNameStr]) {
			this.mockEmitResponses[eventNameStr] = {}
		}

		const skillData = options.skill ?? {
			id: uuid(),
			name: faker.name.title(),
			slug: faker.name.title()
		}

		this.mockEmitResponses[eventNameStr][skillData.id] = {
			eventName,
			skill: skillData,
			payload
		}
	}

	/** Clear the mock data for an event */
	public clearMockResponse<
		EventName extends keyof EventContract,
		ResponsePayload extends EventContract[EventName]['responsePayload']
	>(options: { eventName?: EventName }) {
		const { eventName } = options
		const eventNameStr = eventName as string
		delete this.mockEmitResponses[eventNameStr]
	}

	/** Clear all mock data */
	public clearMocks() {
		this.mockEmitResponses = {}
	}

	private getMockResponsesForEvent<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: {
		eventName: EventName
		eventId: string
	}): IEventResponse<EventContract, EventName, EventSpace>[] {
		const { eventId, eventName } = options
		let responses: IEventResponse<EventContract, EventName, EventSpace>[] = []

		const mockResponses = this.mockEmitResponses[eventName as string]
		if (mockResponses) {
			responses = Object.values(mockResponses).map(r => ({
				...r,
				eventId
			}))
		}

		return responses
	}
}
