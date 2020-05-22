/* eslint-disable @typescript-eslint/no-namespace */
import BaseTest, { test, assert } from '@sprucelabs/test'
import MercuryMock from './MercuryMock'
import { IMercuryEventContract } from './types/mercuryEvents'
import { MercurySubscriptionScope } from './types/subscriptions'
// import { MercurySubscriptionScope } from './types/subscriptions'

export const SpruceEvents = {
	core: {
		DidEnter: 'did-enter',
		DidLeave: 'did-leave'
	},
	booking: {
		GetAppointments: 'booking:get-appointments'
	}
} as const

interface IMyEventContract extends IMercuryEventContract {
	'did-enter': {
		emitPayload: {
			userId: string
			enteredAt: string
		}
		responsePayload: {
			somethingElse: string
		}
	}
	'did-leave': {
		responsePayload: {
			userId: string
		}
	}
	'booking:get-appointments': {
		responsePayload: {
			appointmentIds?: string[]
		}
	}
}

export default class MercuryTest extends BaseTest {
	private static mercury: MercuryMock<IMyEventContract>

	protected static async beforeAll() {
		this.mercury = new MercuryMock({
			spruceApiUrl: 'https://local-api.spruce.ai'
		})
	}

	@test('Can create a mercury instance')
	protected static async createMercury() {
		assert.isOk(this.mercury)
	}

	@test('Can create an event contract')
	protected static async createEventContract() {
		// mercury.emit(
		// 	{ namespace: 'core', eventName: 'didLeave' },
		// 	null,
		// 	body => {
		// 		console.log(body)
		// 	}
		// )
		this.mercury.setMockResponse({
			eventName: SpruceEvents.core.DidEnter,
			payload: {
				somethingElse: 'blah'
			}
		})

		let numCallbacks = 0

		this.mercury.on(
			{
				// eventName: 'did-enter',
				// eventName: SpruceEvents.core.DidEnter,
				eventName: SpruceEvents.core.DidEnter,
				scope: MercurySubscriptionScope.AnonymousGlobal
			},
			options => {
				console.log(options.payload.somethingElse)
				numCallbacks += 1
			}
		)

		const result = await this.mercury.emit({
			eventName: 'did-enter',
			payload: {
				userId: 'asdf',
				enteredAt: 'asdf'
			}
		})

		assert.isOk(result.responses[0].payload.somethingElse)
		assert.equal(numCallbacks, 1)

		// mercury.emit(SpruceEvents.core.didEnter)

		// const eventContract: IMercuryEventContract = {
		// 	core: {
		// 		didEnter: {

		// 		}
		// 	}
		// }
	}
}
