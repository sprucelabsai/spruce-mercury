/* eslint-disable @typescript-eslint/no-namespace */
import BaseTest, { test, assert } from '@sprucelabs/test'
import { Mercury } from './Mercury'
import { IMercuryEventContract } from './types/mercuryEvents'
import { MercurySubscriptionScope } from './types/subscriptions'

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
		payload: {
			userId: string
			enteredAt: string
		}
		body: {
			somethingElse: string
		}
	}
	'did-leave': {
		body: {
			userId: string
		}
	}
	'booking:get-appointments': {
		body: {
			appointmentIds?: string[]
		}
	}
}

export default class MercuryTest extends BaseTest {
	@test('Can create an event contract')
	protected static async createEventContract() {
		const mercury = new Mercury<IMyEventContract>()
		// mercury.emit(
		// 	{ namespace: 'core', eventName: 'didLeave' },
		// 	null,
		// 	body => {
		// 		console.log(body)
		// 	}
		// )
		mercury.on(
			{
				// eventName: 'did-enter',
				// eventName: SpruceEvents.core.DidEnter,
				eventName: SpruceEvents.core.DidEnter,
				scope: MercurySubscriptionScope.AnonymousGlobal
			},
			options => {
				console.log(options.payload.userId)
				console.log(options.payload.enteredAt)
			}
		)

		const result = await mercury.emit({
			eventName: 'did-leave',
			payload: {
				somethingElse: ''
			}
		})

		assert.isOk(result.responses[0].payload.userId)

		// mercury.emit(SpruceEvents.core.didEnter)

		// const eventContract: IMercuryEventContract = {
		// 	core: {
		// 		didEnter: {

		// 		}
		// 	}
		// }
	}
}
