import 'mocha'
import { expect } from 'chai'
import nock from 'nock'
import { downloadFile } from '../../lib/dl/DownloadEngine'
import { Asset, HashAlgo } from '../../lib/dl/Asset'
import { createReadStream, promises as fs } from 'fs'
import { join } from 'path'
import chaiAsPromised from 'chai-as-promised'
import * as chai from 'chai'

chai.use(chaiAsPromised)

describe('DownloadEngine', () => {

    const TEST_DIR = 'test/temp'
    const MOCK_URL = 'http://test.com'
    const MOCK_FILE = 'test-file.txt'
    const MOCK_PATH = join(TEST_DIR, MOCK_FILE)
    const MOCK_CONTENT = 'hello world'
    const MOCK_HASH = '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'
    const MOCK_ASSET: Asset = {
        id: 'test-asset',
        url: `${MOCK_URL}/${MOCK_FILE}`,
        path: MOCK_PATH,
        size: MOCK_CONTENT.length,
        hash: MOCK_HASH,
        algo: HashAlgo.SHA1
    }

    beforeEach(async () => {
        await fs.mkdir(TEST_DIR, { recursive: true })
    })

    afterEach(async () => {
        await fs.rm(TEST_DIR, { recursive: true, force: true })
        nock.cleanAll()
    })

    it('should throw an error if the file hash does not match', async () => {
        nock(MOCK_URL)
            .get(`/${MOCK_FILE}`)
            .reply(200, 'invalid content')

        const asset: Asset = { ...MOCK_ASSET, hash: 'invalid-hash' }

        await expect(downloadFile(asset)).to.be.rejectedWith('File hash does not match expected value for test-asset.')
    })

    it('should retry with exponential backoff on retryable errors', async () => {
        nock(MOCK_URL)
            .get(`/${MOCK_FILE}`)
            .times(3)
            .reply(503)

        nock(MOCK_URL)
            .get(`/${MOCK_FILE}`)
            .reply(200, MOCK_CONTENT)

        const start = Date.now()
        await downloadFile(MOCK_ASSET)
        const end = Date.now()

        // 1s + 2s + 4s = 7s, but we give it some leeway
        expect(end - start).to.be.greaterThan(6000)
    }).timeout(10000)

})