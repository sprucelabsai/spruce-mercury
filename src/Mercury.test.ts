/* eslint-disable @typescript-eslint/no-namespace */
import BaseTest, { test, assert } from '@sprucelabs/test'
import { Mercury } from './Mercury'
import { IMercuryEventContract } from './types/mercuryEvents'

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

const SpruceEvents = {
	core: {
		didEnter: {
			namespace: 'core',
			eventName: 'didEnter'
		},
		didLeave: {
			namespace: 'core',
			eventName: 'didLeave'
		}
	}
} as const

interface IMyEventContract extends IMercuryEventContract {
	core: {
		didEnter: {
			name: string
			body: {
				blah: string
			}
			payload: {
				somethingElse: string
			}
		}
		didLeave: {
			name: string
			body: {
				userId: string
			}
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
		mercury.on

		mercury.emit({
			namespace: 'core',
			eventName: 'didEnter',
			payload: {
				somethingElse: ''
			}
		})

		// mercury.emit(SpruceEvents.core.didEnter)

		// const eventContract: IMercuryEventContract = {
		// 	core: {
		// 		didEnter: {

		// 		}
		// 	}
		// }
	}
}
