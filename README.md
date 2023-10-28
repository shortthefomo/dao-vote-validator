# XRPL VALIDATOR VOTE DEAMON
a deamon to cast votes on your validator from the evernode contract... *todo add link*

## HOW TO INSTALL
install and add the pm2 pservice on the box https://pm2.keymetrics.io
copy .env-example to .env adjust as needed
`$ yarn`

## HOW TO EXECUTE
`$ ./run.sh`
The account use in config must now loginto the Xumm xApp https://xumm.app/detect/xapp:sandbox.8d24752f3bbf 
Here you will need to set again your validator address (this one) and then your vote is communicated via the ledger to this deamon.
It simply watches for a spesific transaction from your defined account and then submits that to the validator to change the ammendment flag.
