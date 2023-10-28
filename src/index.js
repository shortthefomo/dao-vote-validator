const { XrplClient } = require('xrpl-client')
const codec = require('ripple-address-codec')

const dotenv = require('dotenv')
const debug = require('debug')

const log = debug('dao-vote:main')
dotenv.config()

class Main {
    constructor() {
        let client = new XrplClient(process.env.WS_CLIENT)
        let validator = new XrplClient(process.env.WS_VALIDATOR)

        Object.assign(this, {
            async listen() {
                log(codec.encodeNodePublic(Buffer.from("ED420D00EEF1BE462BA916EB9C56680CA8C6DC9117419681A6B12ABB5C4D8A407F", 'hex')))
                process.exit()
                const self = this
                client.send({
                    'command': 'subscribe',
                    'streams': ['ledger']
                })

                client.on('ledger', async (event) => {
                    const request = {
                        'id': 'xrpl-local',
                        'command': 'ledger',
                        'ledger_hash': event.ledger_hash,
                        'ledger_index': 'validated',
                        'transactions': true,
                        'expand': true,
                        'owner_funds': true
                    }
                    const ledger_result = await client.send(request)
                    const transactions = ledger_result?.ledger?.transactions
                    for (let i = 0; i < transactions.length; i++) {
                        const transaction = transactions[i]
                        if (transaction.metaData.TransactionResult !== 'tesSUCCESS') { continue }
                        if (transaction.TransactionType !== 'AccountSet') { continue }
                        await self.accountSet(transaction)
                    }
                })
            },
            async accountSet(transaction) {
                if (transaction.Account !== process.env.ACCOUNT) { return }
                if (!(await this.validateAccountMessageKey())) { return }
                log(transaction)
                const memo = Buffer.from(transaction?.Memos[0]?.Memo.MemoData, 'hex').toString('utf8')
                log(memo)
                try {
                    const json = JSON.parse(memo)
                    log(json)
                    if (json.topic !== 'amendment') { return }
                    if (json.amendment_vote.length === 0) { return }
                    
                    for (let index = 0; index < json.amendment_vote.length; index++) {
                        const hash = json.amendment_vote[index]
                        const vote = json.position
                        const paylaod = {
                            id: 'dao-vote-deamon',
                            command: 'feature',
                            feature: hash,
                            vetoed: vote
                        }
                        log('paylaod', paylaod)
                        const result = await validator.send(paylaod)
                        
                        log(`Vote cast on validator, AMM:${hash} VALUE:${vote}`, result)
                    }
                    
                } catch (e) {
                    // not json and not what looking for ignore
                }
            },
            toHex(bytes) {
                return Buffer.from(bytes).toString('hex').toUpperCase()
            },
            async validateAccountMessageKey() {
                const payload = {
                    'id': 3,
                    'command': 'account_info',
                    'account': process.env.ACCOUNT,
                    'ledger_index': 'current'
                }
                let res = await client.send(payload)

                if ('MessageKey' in res.account_data) {
                    try {
                        if (codec.encodeNodePublic(Buffer.from(res.account_data.MessageKey, 'hex')) === process.env.VALIDATOR_MASTER_KEY) {
                            return true
                        }
                    }catch (e) {
                        // do nothing
                    }
                }
                return false
            }
        })
    }
}

const app = new Main()
app.listen()