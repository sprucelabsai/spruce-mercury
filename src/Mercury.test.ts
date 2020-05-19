/* eslint-disable @typescript-eslint/no-namespace */
import BaseTest, { test, assert } from '@sprucelabs/test'
import { Mercury } from './Mercury'
import { IMercuryEventContract } from './types/mercuryEvents'
import { MercurySubscriptionScope } from './types/subscriptions'

// const eventContract = {
// 	core: {
// 		GetDeveloperSkills: {
// 			payload: string,
// 			body: 'SpruceString'
// 		}
// 	}
// }

// export namespace SpruceEvents.core {
// 	export type GetDeveloperSkills = IMercuryEventContract[string][string]
// 	// export type GetDeveloperSkills = {
// 	// 	IMercuryEventContract[string][string]
// 	// 	/** The event name  */
// 	// 	// export const name = 'get-developer-skills'
// 	// 	// export interface IPayload {
// 	// 	// 	something: string
// 	// 	// }
// 	// 	// export interface IResponseBody {
// 	// 	// 	testBody: string[]
// 	// 	// }
// 	// }
// }

// const SpruceEvents = {
// 	core: {
// 		didEnter: {
// 			namespace: 'core',
// 			eventName: 'didEnter'
// 		},
// 		didLeave: {
// 			namespace: 'core',
// 			eventName: 'didLeave'
// 		}
// 	}
// } as const

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
				console.log(options.payload.blah)
			}
		)

		const result = await mercury.emit({
			eventName: 'did-leave',
			payload: {
				somethingElse: ''
			}
		})

		result.responses[0].payload.userId

		// mercury.emit(SpruceEvents.core.didEnter)

		// const eventContract: IMercuryEventContract = {
		// 	core: {
		// 		didEnter: {

		// 		}
		// 	}
		// }
	}
}
