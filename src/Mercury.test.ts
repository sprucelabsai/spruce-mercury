import BaseTest, { test, assert } from '@sprucelabs/test'
import MercuryAdapterMock from './adapters/MercuryAdapterMock'
import Mercury from './Mercury'
import { IMercuryEventContract } from './types/events.types'
import { MercurySubscriptionScope } from './types/subscriptions.types'

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
	private static mercury: Mercury<IMyEventContract>
	private static adapter: MercuryAdapterMock<IMyEventContract>

	protected static async beforeAll() {
		this.adapter = new MercuryAdapterMock()
		this.mercury = new Mercury({
			adapter: this.adapter,
			spruceApiUrl: 'https://local-api.spruce.ai'
		})
	}

	@test('Can create a mercury instance')
	protected static async createMercury() {
		assert.isOk(this.mercury)
	}

	@test('Can create an event contract')
	protected static async createEventContract() {
		this.adapter.setMockResponse({
			eventName: SpruceEvents.core.DidEnter,
			payload: {
				somethingElse: 'blah'
			}
		})

		let numCallbacks = 0

		this.mercury.on(
			{
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

		assert.isString(result.responses[0].payload.somethingElse)
		assert.equal(result.responses[0].payload.somethingElse, 'blah')
		assert.equal(numCallbacks, 1)
	}
}
