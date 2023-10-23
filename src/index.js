const { XrplClient } = require('xrpl-client')

const dotenv = require('dotenv')
const debug = require('debug')

const log = debug('dao-vote:main')
dotenv.config()

class Main {
    constructor() {
        let client = new XrplClient(process.env.WS_ADMIN_LOCAL)
        
        Object.assign(this, {
            async listen() {
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
                log(transaction)
                const memo = Buffer.from(transaction?.Memos[0]?.Memo.MemoData, 'hex').toString('utf8')
                log('MEMO', memo)
                try {
                    const json = JSON.parse(memo)
                    log('JSON', json)
                    if (json.value.length === 0) { return }
                    if (json.topic !== 'amendment') { return }
                    const vote = (json.position === 0) ? false:true
                    const hash = json.value

                    const result = await client.send({
                        id: 'dao-vote-deamon',
                        command: 'feature',
                        feature: hash,
                        vetoed: vote
                    })

                    log(`Vote cast on validator, AMM:${hash} VALUE:${vote}`, result)
                } catch (e) {
                    // not json and not what looking for ignore
                }
            }
        })
    }
}

const app = new Main()
app.listen()