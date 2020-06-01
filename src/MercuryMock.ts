import MercuryAdapterMock from './adapters/MercuryAdapterMock'
import log from './lib/log'
import Mercury, { MercuryAdapterKind } from './Mercury'
import {
	IMercuryEventContract,
	IOnData,
	ISkillOnData,
	IMercuryEmitOptions,
	OnHandler
} from './types/mercuryEvents'
import { MercurySubscriptionScope } from './types/subscriptions'

let faker: {
	name: {
		title: () => string
	}
}
try {
	faker = require('@sprucelabs/test')
} catch (e) {
	faker = {
		name: {
			title: () => 'testing title'
		}
	}
}

interface IMockEmitResponses {
	[eventName: string]: {
		[skillId: string]: Omit<IOnData<any, any, any>, 'eventId'>
	}
}

export default class MercuryMock<
	EventContract extends IMercuryEventContract
> extends Mercury<EventContract> {
	private mockEmitResponses: IMockEmitResponses = {}

	/** Emit an event and set handler for responses */
	public async emit<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(
		options: IMercuryEmitOptions<EventContract, EventName, EventSpace>,
		handler?: OnHandler<EventContract, EventName, EventSpace>
	): Promise<{
		responses: IOnData<EventContract, EventName, EventSpace>[]
	}> {
		const { eventName } = options

		await this.awaitConnection()

		if (!this.adapter) {
			log.warn('Mercury: Unable to emit because adapter is not set.')
			// @ts-ignore
			return
		}

		const eventId = options.eventId ?? this.uuid()
		if (!this.eventHandlers[eventId]) {
			this.eventHandlers[eventId] = {
				onFinished: [],
				onError: [],
				onResponse: []
			}
		}
		if (handler) {
			this.eventHandlers[eventId].onResponse = [handler]
		}
		this.adapter.emit({
			...options,
			eventId,
			credentials: this.credentials
		})

		process.nextTick(async () => {
			try {
				const responses = this.getMockResponsesForEvent({
					eventName,
					eventId: eventId ?? this.uuid()
				})

				if (responses.length > 0) {
					const promises = responses.map(r => {
						return this.handleEvent({
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
					await this.handleEvent({
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

		const finishedHandler = this.emitOnFinishedCallback(eventId)

		return finishedHandler
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
			id: this.uuid(),
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

	protected setAdapter(options: {
		adapter: MercuryAdapterKind
		connectionOptions: Record<string, any>
	}): boolean {
		const { connectionOptions } = options
		log.debug('setAdapter', { options })

		if (this.adapter) {
			this.adapter.disconnect()
			this.adapter = undefined
		}

		this.adapter = new MercuryAdapterMock()
		this.adapter.init(
			connectionOptions,
			this.handleEvent.bind(this),
			this.handleError.bind(this),
			this.onConnect.bind(this),
			this.onDisconnect.bind(this)
		)

		return true
	}

	private getMockResponsesForEvent<
		EventName extends keyof EventContract,
		EventSpace extends EventContract[EventName]
	>(options: {
		eventName: EventName
		eventId: string
	}): IOnData<EventContract, EventName, EventSpace>[] {
		const { eventId, eventName } = options
		let responses: IOnData<EventContract, EventName, EventSpace>[] = []

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
