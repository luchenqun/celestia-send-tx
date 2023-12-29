import { Tendermint } from "@quarix/provider";
import { decodeTxRaw, Registry } from "@cosmjs/proto-signing";
import { fromBase64, toHex } from "@cosmjs/encoding";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { sha256 } from "@cosmjs/crypto";

const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const main = async () => {
  try {
    const RPC = "https://rpc-celestia.alphab.ai";
    const tdm = new Tendermint({ baseURL: RPC });

    const registry = new Registry(defaultRegistryTypes);
    const MsgSendAction = "/cosmos.bank.v1beta1.MsgSend";

    let startBlockHeight = 354370; // https://www.mintscan.io/celestia/block/354370

    while (true) {
      let block;
      try {
        block = await tdm.block({ height: startBlockHeight });
      } catch (error) {
        await sleep(1000 * 60 * 5); // 证明已经查到最新的区块啦，休眠5分钟等它出些区块在继续查
        continue;
      }

      const txs = block?.block?.data?.txs || [];
      let sendCount = 0;
      let total = 0;
      for (const tx of txs) {
        const txBytes = fromBase64(tx);
        const hash = toHex(sha256(txBytes)).toUpperCase();
        let txRaw;
        try {
          txRaw = decodeTxRaw(txBytes);
        } catch (error) {
          // 有些ibc的交易decodeTxRaw无法处理
          console.warn(`${hash} decode fail, please recheck...`);
        }

        const messages = txRaw?.body?.messages || [];
        let memo = txRaw?.body?.memo || "";
        if (memo) {
          try {
            memo = Buffer.from(fromBase64(memo)).toString("ascii");
          } catch (error) {}
        }
        for (const message of messages) {
          total++;
          if (message.typeUrl === MsgSendAction) {
            const msg = registry.decode(message);
            console.log(`[${msg.fromAddress}] send [${msg.amount[0].amount}${msg.amount[0].denom}] to [${msg.toAddress}], memo is [${memo}], tx hash is [${hash}], block height is [${startBlockHeight}]`);
            sendCount++;
          }
        }
      }

      if (startBlockHeight) {
        console.log(`已经遍历完第${startBlockHeight}个区块的交易, 一共有${total}个消息，找到${sendCount}个Send消息...\n`);
      }

      await sleep(3000); // 读取一个区块等待3秒再去读，不要频繁去读取，怕IP被封了
      startBlockHeight++;
    }
  } catch (error) {
    console.log("error: ", error);
  }
};

main();
