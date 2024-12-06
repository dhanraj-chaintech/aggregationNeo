const {
  IXFI_NETWORK_REFUND,
  IXFIFILTER_REWARDS_AND_TYPE_INTERNAL_INTERNAL_TRANSAFRESPACE_NOTIN_WITH_TRANSACTION_NUM,
  addSenderToReceiver,
  AddReceiverInSender,
  mapSenderAndReceiverDetails,
  groupBasedOnTranSendAndRec,
  groupBasedOnRewardsRemoveDuplicate,
  groupOtherTransactionType,
  groupTransactionFrequency,
  groupTransactionFrequencyYear,
} = require("./dataPipeline");

const db = require("./db"); // Assuming this exports a connected MongoDB client

const collectionName = "wallet_history";
const kytCollectionName = "wallet_history_kyt";
const platformName = "IXFI";
const groupingKytCOllectionName = "wallet_history_kyt_group";
// Migration function for IXFI Network Refund
const DataMigration_Network_refund = async function () {
  try {
    console.log(`Starting data migration for platform: ${platformName}`);

    const data = await db
      .collection(collectionName)
      .aggregate(IXFI_NETWORK_REFUND)
      .toArray();

    if (data.length === 0) {
      console.log("No data found for migration.");
      return;
    }

    const bulkOperations = data.map((item) => {
      const {
        _id,
        internal_status = null,
        user_id,
        transaction_number,
        ...rest
      } = item;
      let sender = `IXFI ${transaction_number}`;
      if (internal_status === "network_fee_refunded")
        sender = "@IXFI NETWORK FEE REFUND";
      const transformedItem = {
        _id,
        ...rest,
        platform: platformName,
        sender,
        transaction_number,
        receiver: user_id,
        user_id,
        receiverEmail: "",
        receiverName: "",
        senderEmail: "",
        senderName: "",
      };

      return {
        updateOne: {
          filter: { _id },
          update: { $set: transformedItem },
          upsert: true,
        },
      };
    });

    const result = await db
      .collection(kytCollectionName)
      .bulkWrite(bulkOperations);

    console.log(
      `Data migration completed successfully for platform: ${platformName}`
    );
    console.log(
      `${result.matchedCount} documents matched, ${result.modifiedCount} updated, and ${result.upsertedCount} inserted into ${kytCollectionName}.`
    );
  } catch (error) {
    console.error("Error during data migration:", error.message);
    console.error(error);
  }
};

// Migration function for Transaction IDs
const DataMigration_Transaction_Id = async function () {
  try {
    console.log(`Starting data migration for platform: ${platformName}`);

    const data = await db
      .collection(collectionName)
      .aggregate(
        IXFIFILTER_REWARDS_AND_TYPE_INTERNAL_INTERNAL_TRANSAFRESPACE_NOTIN_WITH_TRANSACTION_NUM
      )
      .toArray();

    if (data.length === 0) {
      console.log("No data found for migration.");
      return;
    }

    const bulkOperations = data.map((item) => {
      const {
        _id,
        user_id,
        transaction_type,
        transaction_number,
        systemTags,
        ...rest
      } = item;

      let transformedItem = {};
      if (transaction_type === "send") {
        transformedItem = {
          _id,
          ...rest,
          platform: platformName,
          transaction_number,
          transaction_type: "send",
          sender: user_id,
          receiver: "",
          user_id,
        };
      } else if (transaction_type === "receive") {
        transformedItem = {
          _id,
          ...rest,
          platform: platformName,
          transaction_number,
          transaction_type: "receive",
          sender: "",
          receiver: user_id,
          user_id,
        };
      }

      return {
        updateOne: {
          filter: { _id },
          update: { $set: transformedItem },
          upsert: true,
        },
      };
    });

    const result = await db
      .collection(kytCollectionName)
      .bulkWrite(bulkOperations);

    console.log(
      `Data migration completed successfully for platform: ${platformName}`
    );
    console.log(
      `${result.matchedCount} documents matched, ${result.modifiedCount} updated, and ${result.upsertedCount} inserted into ${kytCollectionName}.`
    );
  } catch (error) {
    console.error("Error during data migration:", error.message);
    console.error(error);
  }
};

// Function to add Receiver Address
const AddReceiverAddress = async function () {
  try {
    console.log(
      `Starting data mapping sender to receiver for platform: ${platformName}`
    );

    const data = await db
      .collection(kytCollectionName)
      .aggregate(addSenderToReceiver)
      .toArray();

    if (data.length === 0) {
      console.log("No data found for mapping.");
      return;
    }

    const bulkOperations = data.map((item) => {
      const {
        _id,
        user_id,
        transaction_number,
        systemTags,
        transaction_id,
        sender_doc = null,
        transaction_type,
        source_address,
        ...rest
      } = item;

      let transformedItem = {
        ...rest,
        _id,
        transaction_id,
        source_address,
        systemTags,
        transaction_type,
        user_id,
        transaction_number,
        platform: platformName,
      };

      if (transaction_type === "receive") {
        if (transaction_number == "@IXFI-REWARDS") {
          // /(Referral|Rewards|Affiliate|referral|rewards|affiliate)/
          let sender = `${transaction_id}`;

          if (/(referral)/.test(transaction_id.toLowerCase()))
            sender = "@IXFI-REFERRAL-REWARDS";
          else if (/(affiliate)/.test(transaction_id.toLowerCase()))
            sender = "@IXFI-AFFILIATE_REWARDS";
          else if (/(rewards)/.test(transaction_id.toLowerCase()))
            sender = "@IXFI-REWARDS";

          transformedItem = {
            _id,
            ...rest,
            platform: platformName,
            transaction_number,
            sender,
            receiver: user_id,
          };
        } else if (
          systemTags?.some((tag) =>
            ["network_fee_refund", "@IXFI-Network-Fee-Refund"].includes(tag)
          )
        ) {
          transformedItem = {
            _id,
            ...rest,
            platform: platformName,
            transaction_number,
            sender: "@IXFI NETWORK FEE REFUND",
            receiver: user_id,
          };
        } else if (sender_doc?._id) {
          transformedItem = {
            _id,
            ...rest,
            platform: platformName,
            transaction_number,
            sender: sender_doc.user_id,
            receiver: user_id,
          };
        } else if (!sender_doc?._id) {
          let senderExternalType = 'EXTERNAL';
          if(!isNaN(parseInt(transaction_number, 10))) senderExternalType ='BINANCE';
          if(transaction_number.length > 40) senderExternalType = 'SUPER_EXTERNAL';
          transformedItem = {
            _id,
            ...rest,
            platform: senderExternalType,
            transaction_number,
            sender:(senderExternalType==="SUPER_EXTERNAL")?source_address: senderExternalType, 
            receiver: user_id,
          };
        } else {
          transformedItem = {
            _id,
            ...rest,
            platform: platformName,
            transaction_number,
            receiver: user_id,
          };
        }
      }

      return {
        updateOne: {
          filter: { _id },
          update: { $set: transformedItem },
          upsert: true,
        },
      };
    });

    const result = await db
      .collection(kytCollectionName)
      .bulkWrite(bulkOperations);

    console.log(
      `Sender to receiver mapping completed for platform: ${platformName}`
    );
    console.log(
      `${result.matchedCount} documents matched, ${result.modifiedCount} updated, and ${result.upsertedCount} inserted into ${kytCollectionName}.`
    );
  } catch (error) {
    console.error("Error during mapping sender to receiver:", error.message);
    console.error(error);
  }
};

// Function to add Sender Address
const AddSenderAddress = async function () {
  try {
    console.log(
      `Starting data mapping receiver to sender for platform: ${platformName}`
    );

    const data = await db
      .collection(kytCollectionName)
      .aggregate(AddReceiverInSender)
      .toArray();

    if (data.length === 0) {
      console.log("No data found for mapping.");
      return;
    }

    const bulkOperations = data.map((item) => {
      const {
        _id,
        user_id,
        transaction_number,
        transaction_id,
        receiver_doc = null,
        transaction_type,
        destination_address=null,
        ...rest
      } = item;

      let transformedItem = {
        ...rest,
        _id,
        user_id,
        transaction_id,
        transaction_type,
        transaction_number,
        platform: platformName,
        destination_address
      };

      if (transaction_type === "send") {
        transformedItem.sender = user_id;
        if (receiver_doc?._id) {
          transformedItem.receiver = receiver_doc.user_id;
        } else {
          let receiverExternalType = 'EXTERNAL';
          if(!isNaN(parseInt(transaction_number, 10))) receiverExternalType ='BINANCE';
          if(transaction_number.length > 40) receiverExternalType = 'SUPER_EXTERNAL';
          transformedItem.receiver = (receiverExternalType==="SUPER_EXTERNAL")?destination_address: receiverExternalType;
          transformedItem.platform =receiverExternalType;
        }
      }

      return {
        updateOne: {
          filter: { _id },
          update: { $set: transformedItem },
          upsert: true,
        },
      };
    });

    const result = await db
      .collection(kytCollectionName)
      .bulkWrite(bulkOperations);

    console.log(
      `Receiver to sender mapping completed for platform: ${platformName}`
    );
    console.log(
      `${result.matchedCount} documents matched, ${result.modifiedCount} updated, and ${result.upsertedCount} inserted into ${kytCollectionName}.`
    );
  } catch (error) {
    console.error("Error during mapping receiver to sender:", error.message);
    console.error(error);
  }
};

const AddSenderReceiverDetails = async function () {
  try {
    console.log(`Starting data mapping sender and receiver from users schema`);

    const data = await db
      .collection(kytCollectionName)
      .aggregate(mapSenderAndReceiverDetails)
      .toArray();

    if (data.length === 0) {
      console.log("No data found for mapping.");
      return;
    }

    const bulkOperations = data.map((item) => {
      const {
        _id,
        receiverEmail = "",
        receiverName = "",
        senderEmail = "",
        senderName = "",
        ...rest
      } = item;

      let transformedItem = {
        _id,
        senderEmail,
        senderName,
        receiverEmail,
        receiverName,
        ...rest,
      };
      return {
        updateOne: {
          filter: { _id },
          update: { $set: transformedItem },
          upsert: true,
        },
      };
    });

    const result = await db
      .collection(kytCollectionName)
      .bulkWrite(bulkOperations);

    console.log(`data mapping sender and receiver from users schema`);
    console.log(
      `${result.matchedCount} documents matched, ${result.modifiedCount} updated, and ${result.upsertedCount} inserted into ${kytCollectionName}.`
    );
  } catch (error) {
    console.error(
      "Error during data mapping sender and receiver from users schema:",
      error.message
    );
    console.error(error);
  }
};

// Function to group transaction based on remove duplicated and add send and rec both in one transaction
const GropingTransaction = async function () {
  try {
    console.log(
      `Starting data mapping receiver to sender for platform: ${platformName}`
    );

    // Fetch grouped data
    const [sendRecTrans, rewardsTrans, otherTrans] = await Promise.all([
      db
        .collection(kytCollectionName)
        .aggregate(groupBasedOnTranSendAndRec)
        .toArray(),
      db
        .collection(kytCollectionName)
        .aggregate(groupBasedOnRewardsRemoveDuplicate)
        .toArray(),
      db
        .collection(kytCollectionName)
        .aggregate(groupOtherTransactionType)
        .toArray(),
    ]);

    if (!sendRecTrans.length && !rewardsTrans.length && !otherTrans.length) {
      console.log("No data found for grouping.");
      return;
    }

    // Helper function to generate bulk operations
    const createBulkOperations = (data, uniqueField) =>
      data.map(({ _id,transaction_usd_value ,...rest }) => {
      if(!transaction_usd_value) transaction_usd_value = 0;
        const uniqueValue = rest[uniqueField];
        return {
          updateOne: {
            filter: { [uniqueField]: uniqueValue },
            update: { $set: {transaction_usd_value,...rest} },
            upsert: true,
          },
        };
      });

    // Prepare bulk operations
    const bulkOperations = [
      ...createBulkOperations(sendRecTrans, "transaction_number"),
      ...createBulkOperations(otherTrans, "transaction_id"),
      ...createBulkOperations(rewardsTrans, "transaction_id"),
    ];

    if (!bulkOperations.length) {
      console.log("No bulk operations to perform.");
      return;
    }

    // Execute bulkWrite
    const result = await db
      .collection(groupingKytCOllectionName)
      .bulkWrite(bulkOperations);

    // Log results
    console.log(
      `Grouping data insertion completed for platform: ${platformName}`
    );
    console.log(
      `${result.matchedCount} documents matched, ${result.modifiedCount} updated, and ${result.upsertedCount} inserted into ${groupingKytCOllectionName}.`
    );
    process.exit(0);
  } catch (error) {
    console.error("Error during grouping data insertion:", error.message);
    console.error(error.stack);
  }
};

(async () => {
  await DataMigration_Network_refund();
  await DataMigration_Transaction_Id();
  await AddReceiverAddress();
  await AddSenderAddress();
  await AddSenderReceiverDetails();
  await GropingTransaction();
})();
