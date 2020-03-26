import { assert } from 'chai'
import Base from './Base'
import { Mercury } from '../src/Mercury'

class MercuryTests extends Base {
	public setup() {
		it('Can create a mercury instance', () => this.createMercury())
	}

	public async createMercury() {
		const mercury = new Mercury()
		assert.isOk(mercury)
	}
}

describe('MercuryTests', function Tests() {
	new MercuryTests()
})
