'use strict'

const { register } = require('.')
const Travis = require('../engines/travis')
const BuildStatus = require('../build-status.enum')
const engineFactory = require('../engines/factory')
const { expect } = require('code')
const sinon = require('sinon')

describe('widget-ci/server', () => {
  context('branch configuration', () => {
    it('defaults to master branch', () => {
      const config = { provider: 'travis', user: 'x', repo: 'y' }
      const configuration = register(config)
      expect(configuration.config.branch).to.equal('master')
    })

    it('can override branch', () => {
      const config = { provider: 'travis', user: 'x', repo: 'y', branch: 'feature/xyz' }
      const configuration = register(config)
      expect(configuration.config.branch).to.equal('feature/xyz')
    })
  })

  context('show owner', () => {
    it('do not show repo owner', () => {
      const config = { provider: 'travis', user: 'x', repo: 'y', hideOwner: true }
      const configuration = register(config)
      expect(configuration.config.hideOwner).to.be.true()
    })

    it('show repo owner', () => {
      const config = { provider: 'travis', user: 'x', repo: 'y' }
      const configuration = register(config)
      expect(configuration.config.hideOwner).to.be.false()
    })
  })

  context('provider is travis', () => {
    it('No config for travis', () => {
      const config = { provider: 'travis', user: 'x', repo: 'y' }
      const configuration = register(config)
      expect(configuration.config.provider).to.equal(config.provider)
    })
  })

  context('provider is circleci', () => {
    it('Auth for circleci', () => {
      const config = { provider: 'circleci', user: 'x', repo: 'y', options: { auth: 'aaa' } }
      const configuration = register(config)
      expect(configuration.config.provider).to.equal(config.provider)
    })
  })

  context.skip('Sound configuration', () => {
    let instance
    let sandbox
    let emitStub

    before(() => {
      sandbox = sinon.sandbox.create()
      const travisStub = sinon.createStubInstance(Travis)
      travisStub.fetchBuildStatus.resolves(BuildStatus.passed)
      const TravisClassStub = sandbox.stub(Travis.prototype, 'constructor').returns(travisStub)
      sandbox.stub(engineFactory, 'getEngine').returns(TravisClassStub)
      emitStub = sandbox.stub()

      instance = register({
        provider: 'travis',
        user: 'x',
        repo: 'y',
        sounds: {
          passed: 'recovery-sound'
        }
      }, emitStub)

      return instance.update()
    })

    after(() => {
      sandbox.restore()
    })

    it('Calls stub', () => {
      expect(emitStub.callCount).to.equal(1)
    })

    it('Emits sound event', () => {
      expect(emitStub.firstCall.args[0]).to.equal('audio:play')
    })

    it('Delivers sound payload', () => {
      expect(emitStub.firstCall.args[1]).to.equal({ data: 'recovery-sound' })
    })

    it('Sound only plays on state change', () => {
      return instance.update()
        .then(() => {
          expect(emitStub.callCount).to.equal(1)
        })
    })

    const scenarios = [
      { scenario: 'all specified', sounds: { passed: 'x', failed: 'y', unknown: 'z' } },
      { scenario: 'passed specified', sounds: { passed: 'x' } },
      { scenario: 'failed specified', sounds: { failed: 'y' } },
      { scenario: 'unknown specified', sounds: { unknown: 'z' } }
    ]

    scenarios.forEach(({ scenario, sounds }) => {
      it(`Sound config ${scenario}`, () => {
        const config = { provider: 'travis', user: 'x', repo: 'y', sounds }
        const configuration = register(config)
        expect(configuration.config.provider).to.equal(config.provider)
      })
    })
  })
})
