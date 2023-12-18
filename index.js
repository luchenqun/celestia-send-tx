import { App, Tendermint } from "@quarix/provider";

const main = async () => {
  try {
    const MsgSendAction = "/cosmos.bank.v1beta1.MsgSend";
    const API = "http://evmosapi.lucq.fun";
    const RPC = "http://evmosrpc.lucq.fun";
    const app = new App({ baseURL: API });
    const tdm = new Tendermint({ baseURL: RPC });

    let startBlockHeight = 62500;
    const endBlockHeight = 62600;

    while (startBlockHeight <= endBlockHeight) {
      const { txs } = await tdm.txSearch({
        query: `"tx.height=${startBlockHeight}"`,
        page: 1,
        per_page: 1000,
      });
      for (const tx of txs) {
        // 通过日志确认这笔交易是否为一笔 MsgSend 交易
        if ((tx?.tx_result?.log || "").includes(MsgSendAction)) {
          // 如果确认这是一笔  MsgSend 交易，那么我们由于我们需要memo，我们得继续查询交易信息

          const txDetail = await app.tx.getTx(tx.hash);
          const body = txDetail.tx.body;
          const from = body.messages[0].from_address;
          const to = body.messages[0].to_address;
          const amount = JSON.stringify(body.messages[0].amount);
          const memo = body.memo;
          console.log(`[${from}] send [${amount}] to [${to}], memo is [${memo}], block height is [${startBlockHeight}], tx hash is [${tx.hash}]`);
        }
      }
      startBlockHeight++;

      if (startBlockHeight % 10 == 0) {
        console.log(`已经遍历完${startBlockHeight}个区块...`);
      }
    }
  } catch (error) {
    console.log("error: ", error);
  }
};

main();
