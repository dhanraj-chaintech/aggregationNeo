// const DuplicationWithDiffTransaction = [
//   {
//     $match: {
//       destination_address: { $ne: null },
//       source_address: { $ne: null },
//       status: "completed",
//     },
//   },
//   {
//     $lookup: {
//       from: "user_overview_histories",
//       localField: "_id",
//       foreignField: "reference_id",
//       as: "relatedHistories",
//     },
//   },
//   {
//     $match: {
//       $expr: {
//         $ne: ["$destination_address", "$source_address"],
//       },
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "user_id",
//       foreignField: "_id",
//       as: "user",
//     },
//   },
//   {
//     $group: {
//       _id: {
//         user_id: "$user_id",
//         source_address: "$source_address",
//         destination_address: "$destination_address",
//       },
//       count: { $sum: 1 },
//       user: {
//         $push: { $arrayElemAt: ["$user", 0] },
//       },
//       transactions: {
//         $push: {
//           transaction_id: "$transaction_id",
//           transaction_amount: "$transaction_amount",
//           transaction_usd_value: "$transaction_usd_value",
//           transaction_type: "$transaction_type",
//           coin_code: "$coin_code",
//           created_at: "$created_at",
//           systemTags: "$relatedHistories.system_tags",
//           fund_source: "$fund_source",
//         },
//       },
//       totalAmount: { $sum: "$transaction_amount" },
//     },
//   },
//   {
//     $project: {
//       _id: 0,
//       user_id: "$_id.user_id",
//       source_address: "$_id.source_address",
//       destination_address: "$_id.destination_address",
//       transactions: 1,
//       totalAmount: 1,
//       count: 1,
//       transaction_type: {
//         $arrayElemAt: ["$transactions.transaction_type", 0],
//       },
//       coin_code: {
//         $arrayElemAt: ["$transactions.coin_code", 0],
//       },
//       userEmail: {
//         $arrayElemAt: ["$user.email", 0],
//       },
//       userName: {
//         $arrayElemAt: ["$user.username", 0],
//       },
//     },
//   },
// ];

// const DsNotNull = [
//   {
//     $match: {
//       destination_address: { $ne: null },
//       source_address: { $ne: null },
//     },
//   },
//   {
//     $lookup: {
//       from: "user_overview_histories",
//       localField: "_id", // Field in the current collection
//       foreignField: "reference_id", // Field in the user_overview_histories collection
//       as: "relatedHistories",
//     },
//   },
//   {
//     $project: {
//       _id: 1,
//       transaction_id: 1,
//       coin_code: 1,
//       user_id: 1,
//       fund_source: 1,
//       transaction_type: 1,
//       transaction_amount: 1,
//       transaction_usd_value: 1,
//       transaction_type: 1,
//       destination_address: 1,
//       source_address: 1,
//       created_at: 1,
//       systemTags: { $arrayElemAt: ["$relatedHistories.system_tags", 0] }, // Projecting system_tags as a single array
//     },
//   },
// ];

const destinationNotNull = [
  {
    $match: {
      destination_address: { $ne: null },
    },
  },
];

const IXFI_NETWORK_REFUND = [
  {
    $match: {
      destination_address: null,
      source_address: null,
      status: "completed",
      coin_code: {
        $nin: [
          "tltc",
          "tzec",
          "teth",
          "tbtc",
          "tdash",
          "tbch",
          "txrp",
          "terc",
          "talgo",
        ],
      },
    },
  },
  {
    $lookup: {
      from: "user_overview_histories",
      localField: "_id", // Field in the current collection
      foreignField: "reference_id", // Field in the user_overview_histories collection
      as: "relatedHistories",
    },
  },
  {
    $lookup: {
      from: "users", // Collection name should be in quotes
      localField: "user_id", // Field in the current collection
      foreignField: "_id", // Field in the users collection
      as: "users",
    },
  },
  {
    $match: {
      $or: [
        {
          "relatedHistories.system_tags": {
            $elemMatch: {
              $nin: [
                "LOAD",
                "UNLOAD",
                "ONBOARDING_FEE",
                "ONBOARDING_FEE_REFUND",
                "CARD_LOST_AND_REPLACE_FEE",
                "CARD_LOST_AND_REPLACE_FEE_REFUND",
                "CARD_NON_MAINTENANCE_FEE",
                "CARD_NON_MAINTENANCE_FEE_REFUND",
                "REFUND",
                "CARD_ONBOARDING_FEE",
                "CARD_FUNDING_LOAD",
              ],
            },
          },
        },
        {
          "relatedHistories.system_tags": { $exists: false }, // Include documents where system_tags don't exist
        },
      ],
    },
  },
  {
    $project: {
      _id: 1,
      transaction_id: 1,
      transaction_type: 1,
      destination_address: 1,
      coin_id: 1,
      coin_code: 1,
      cardex_fee: 1,
      network_fee: 1,
      source_address: 1,
      destination_tag: 1,
      user_id: 1,
      transaction_amount: 1,
      transaction_usd_value: 1,
      is_admin_wallet: 1,
      status: 1,
      internal_status: 1,
      fund_source: 1,
      reference_withdraw_id: 1,
      network_id: 1,
      provider_id: 1,
      network_fee: 1,
      is_migrated: 1,
      request_id: 1,
      fund_source: 1,
      internal_status: 1,
      internal_transaction_id: 1,
      deleted: 1,
      created_at: 1,
      cardex_fee: 1,
      updated_at: 1,
      __v: 1,

      username: { $arrayElemAt: ["$users.username", 0] },
      email: { $arrayElemAt: ["$users.email", 0] },

      systemTags: {
        $ifNull: [{ $arrayElemAt: ["$relatedHistories.system_tags", 0] }, []], // Return empty array if system_tags is null
      },

      // Add transaction_number by extracting numeric value from transaction_id
      transaction_number: {
        $let: {
          vars: {
            matchResult: {
              $regexFind: {
                input: "$transaction_id",
                regex: "\\d+",
              },
            },
          },
          in: {
            $ifNull: ["$$matchResult.match", ""], // Default to an empty string if no match is found
          },
        },
      },
    },
  },
];

const IXFIFILTER_REWARDS_AND_TYPE_INTERNAL_INTERNAL_TRANSAFRESPACE_NOTIN_WITH_TRANSACTION_NUM =
  [
    {
      $match: {
        status: "completed",
        coin_code: {
          $nin: [
            "tltc",
            "tzec",
            "teth",
            "tbtc",
            "tdash",
            "tbch",
            "txrp",
            "terc",
            "talgo",
          ],
        },
      },
    },
    {
      $addFields: {
        transaction_number: {
          $cond: {
            if: {
              $gt: [
                {
                  $strLenCP: {
                    $ifNull: [{ $toString: "$transaction_id" }, ""],
                  },
                },
                50,
              ],
            },
            then: { $toString: "$transaction_id" }, // Use transaction_id as transaction_number
            else: {
              $cond: {
                if: {
                  $or: [
                    {
                      $regexMatch: {
                        input: "$transaction_id",
                        regex:
                          /(Referral|Rewards|Affiliate|referral|rewards|affiliate)/,
                      },
                    },
                  ],
                },
                then: "@IXFI-REWARDS",
                else: {
                  $let: {
                    vars: {
                      matchResult: {
                        $regexFind: {
                          input: "$transaction_id",
                          regex: "\\d+",
                        },
                      },
                    },
                    in: {
                      $ifNull: ["$$matchResult.match", ""],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $match: {
        $and: [
          { transaction_type: { $in: ["send", "receive"] } },
          { transaction_id: { $nin: ["internal", "Internal transfer ", "-"] } },
          {
            $or: [
              {
                system_tags: {
                  $nin: [
                    "LOAD",
                    "UNLOAD",
                    "ONBOARDING_FEE",
                    "ONBOARDING_FEE_REFUND",
                    "CARD_LOST_AND_REPLACE_FEE",
                    "CARD_LOST_AND_REPLACE_FEE_REFUND",
                    "CARD_NON_MAINTENANCE_FEE",
                    "CARD_NON_MAINTENANCE_FEE_REFUND",
                    "REFUND",
                    "CARD_ONBOARDING_FEE",
                    "CARD_FUNDING_LOAD",
                  ],
                },
              },
              { system_tags: { $exists: false } },
            ],
          },
        ],
      },
    },
    {
      $addFields: {
        transaction_number: {
          $ifNull: [{ $toString: "$transaction_number" }, ""],
        }, // Ensure the field is a string, default to empty string if missing
      },
    },
    {
      $lookup: {
        from: "user_overview_histories",
        localField: "_id", // Field in the current collection
        foreignField: "reference_id", // Field in the user_overview_histories collection
        as: "relatedHistories",
      },
    },
    {
      $lookup: {
        from: "users", // Collection name should be in quotes
        localField: "user_id", // Field in the current collection
        foreignField: "_id", // Field in the users collection
        as: "users",
      },
    },
    {
      $match: {
        $or: [
          {
            "relatedHistories.system_tags": {
              $elemMatch: {
                $nin: [
                  "LOAD",
                  "UNLOAD",
                  "ONBOARDING_FEE",
                  "ONBOARDING_FEE_REFUND",
                  "CARD_LOST_AND_REPLACE_FEE",
                  "CARD_LOST_AND_REPLACE_FEE_REFUND",
                  "CARD_NON_MAINTENANCE_FEE",
                  "CARD_NON_MAINTENANCE_FEE_REFUND",
                  "REFUND",
                  "CARD_ONBOARDING_FEE",
                  "CARD_FUNDING_LOAD",
                ],
              },
            },
          },
          {
            "relatedHistories.system_tags": { $exists: false }, // Include documents where system_tags don't exist
          },
        ],
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $strLenCP: "$transaction_number" }, 5] }, // Ensure transaction_number length > 5
      },
    },
    {
      $project: {
        _id: 1,
        transaction_id: 1,
        transaction_type: 1,
        destination_address: 1,
        coin_id: 1,
        coin_code: 1,
        cardex_fee: 1,
        network_fee: 1,
        source_address: 1,
        destination_tag: 1,
        user_id: 1,
        transaction_amount: 1,
        transaction_usd_value: 1,
        is_admin_wallet: 1,
        status: 1,
        internal_status: 1,
        fund_source: 1,
        reference_withdraw_id: 1,
        network_id: 1,
        provider_id: 1,
        network_fee: 1,
        is_migrated: 1,
        request_id: 1,
        fund_source: 1,
        internal_status: 1,
        internal_transaction_id: 1,
        deleted: 1,
        created_at: 1,
        cardex_fee: 1,
        updated_at: 1,
        __v: 1,
        transaction_number: 1,
        username: { $arrayElemAt: ["$users.username", 0] },
        email: { $arrayElemAt: ["$users.email", 0] },

        systemTags: {
          $ifNull: [{ $arrayElemAt: ["$relatedHistories.system_tags", 0] }, []], // Return empty array if system_tags is null
        },
      },
    },
  ];

const addSenderToReceiver = [
  {
    $lookup: {
      from: "wallet_history_kyt",
      let: { transactionNumber: "$transaction_number" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$transaction_number", "$$transactionNumber"] },
                { $ne: ["$internal_status", "network_fee_refunded"] },
                { $eq: ["$transaction_type", "send"] },
              ],
            },
          },
        },
      ],
      as: "sender_doc",
    },
  },
  {
    $set: {
      sender_doc: { $arrayElemAt: ["$sender_doc", 0] }, // Flatten sender_doc if it's an array
    },
  },
];
const AddReceiverInSender = [
  {
    $lookup: {
      from: "wallet_history_kyt",
      let: { transactionNumber: "$transaction_number" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$transaction_number", "$$transactionNumber"] },
                { $ne: ["$internal_status", "network_fee_refunded"] },
                { $eq: ["$transaction_type", "receive"] },
              ],
            },
          },
        },
      ],
      as: "receiver_doc",
    },
  },
  {
    $set: {
      receiver_doc: { $arrayElemAt: ["$receiver_doc", 0] }, // Flatten sender_doc if it's an array
    },
  },
];

const mapSenderAndReceiverDetails = [
  {
    $lookup: {
      from: "users",
      localField: "sender",
      foreignField: "_id",
      as: "senderDetails",
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "receiver",
      foreignField: "_id",
      as: "receiverDetails",
    },
  },
  {
    $project: {
      _id: 1,
      transaction_type: 1,
      transaction_number: 1,
      transaction_id: 1,
      internal_status: 1,
      sender: 1,
      receiver: 1,
      senderName: {
        $cond: {
          if: {
            $regexMatch: {
              input: { $toString: "$sender" }, // Convert sender to string
              regex: "ixfi",
              options: "i",
            },
          },
          then: "ixfi", // Set name to "ixfi" if sender contains "ixfi"
          else: { $arrayElemAt: ["$senderDetails.username", 0] }, // Extract actual sender's username
        },
      },
      senderEmail: {
        $cond: {
          if: {
            $regexMatch: {
              input: { $toString: "$sender" }, // Convert sender to string
              regex: "ixfi",
              options: "i",
            },
          },
          then: "", // Set email to empty if sender contains "ixfi"
          else: { $arrayElemAt: ["$senderDetails.email", 0] }, // Extract actual sender's email
        },
      },
      receiverName: {
        $cond: {
          if: {
            $regexMatch: {
              input: { $toString: "$receiver" }, // Convert receiver to string
              regex: "ixfi",
              options: "i",
            },
          },
          then: "ixfi", // Set name to "ixfi" if receiver contains "ixfi"
          else: { $arrayElemAt: ["$receiverDetails.username", 0] }, // Extract actual receiver's username
        },
      },
      receiverEmail: {
        $cond: {
          if: {
            $regexMatch: {
              input: { $toString: "$receiver" }, // Convert receiver to string
              regex: "ixfi",
              options: "i",
            },
          },
          then: "", // Set email to empty if receiver contains "ixfi"
          else: { $arrayElemAt: ["$receiverDetails.email", 0] }, // Extract actual receiver's email
        },
      },
    },
  },
];

const MaxTransaction = [
  {
    $group: {
      _id: "$user_id",
      count: {
        $sum: 1,
      },
    },
  },
  {
    $sort: {
      count: -1,
    },
  },
];

const groupBasedOnTranSendAndRec = [
  {
    $match: {
      transaction_id: {
        $nin: ["internal", "Internal transfer ", "-"],
      },
      transaction_number: { $nin: [/IXFI/] },
      transaction_type: {
        $in: ["send", "receive"],
      },
    },
  },
  {
    $group: {
      _id: "$transaction_number",
      sender: { $first: "$sender" },
      receiver: { $first: "$receiver" },
      transaction_type: {
        $first: "$transaction_type",
      },
      coin_code: { $first: "$coin_code" },
      coin_id: {
        $first: "$coin_id",
      },
      fund_source: {
        $first: "$fund_source",
      },
      status: {
        $first: "$status",
      },
      systemTags: {
        $first: "$systemTags",
      },
      transaction_id: {
        $first: "$transaction_id",
      },
      internal_status: {
        $first: "$internal_status",
      },
      transaction_usd_value: {
        $first: "$transaction_usd_value",
      },
      senderName: { $first: "$senderName" },
      receiverName: { $first: "$receiverName" },
      senderEmail: { $first: "$senderEmail" },
      receiverEmail: { $first: "$receiverEmail" },
      transaction_amount: {
        $first: "$transaction_amount",
      },
      transaction_number: {
        $first: "$transaction_number",
      },
      created_at: {
        $first: "$created_at",
      },
    },
  },
];
const groupBasedOnRewardsRemoveDuplicate = [
  {
    $match: {
      transaction_number: { $in: [/IXFI/, /ixfi/, /Referral/] },
    },
  },
  {
    $group: {
      _id: "$transaction_id",
      sender: { $first: "$sender" },
      receiver: { $first: "$receiver" },
      transaction_type: {
        $first: "$transaction_type",
      },
      coin_code: { $first: "$coin_code" },
      coin_id: {
        $first: "$coin_id",
      },
      fund_source: {
        $first: "$fund_source",
      },
      status: {
        $first: "$status",
      },
      systemTags: {
        $first: "$systemTags",
      },
      transaction_id: {
        $first: "$transaction_id",
      },
      internal_status: {
        $first: "$internal_status",
      },
      transaction_usd_value: {
        $first: "$transaction_usd_value",
      },
      senderName: { $first: "$senderName" },
      receiverName: { $first: "$receiverName" },
      senderEmail: { $first: "$senderEmail" },
      receiverEmail: { $first: "$receiverEmail" },
      transaction_amount: {
        $first: "$transaction_amount",
      },
      transaction_number: {
        $first: "$transaction_number",
      },
      created_at: {
        $first: "$created_at",
      },
    },
  },
];
const groupOtherTransactionType = [
  {
    $match: {
      transaction_id: {
        $nin: ["internal", "Internal transfer ", "-"],
      },
      transaction_type: {
        $nin: ["send", "receive"],
      },
    },
  },
  {
    $group: {
      _id: "$transaction_number",
      sender: { $first: "$sender" },
      receiver: { $first: "$receiver" },
      transaction_type: {
        $first: "$transaction_type",
      },
      coin_code: { $first: "$coin_code" },
      coin_id: {
        $first: "$coin_id",
      },
      fund_source: {
        $first: "$fund_source",
      },
      status: {
        $first: "$status",
      },
      systemTags: {
        $first: "$systemTags",
      },
      transaction_id: {
        $first: "$transaction_id",
      },
      internal_status: {
        $first: "$internal_status",
      },
      transaction_usd_value: {
        $first: "$transaction_usd_value",
      },
      senderName: { $first: "$senderName" },
      receiverName: { $first: "$receiverName" },
      senderEmail: { $first: "$senderEmail" },
      receiverEmail: { $first: "$receiverEmail" },
      transaction_amount: {
        $first: "$transaction_amount",
      },
      transaction_number: {
        $first: "$transaction_number",
      },
      created_at: {
        $first: "$created_at",
      },
    },
  },
];
const groupTransactionFrequency = [
  {
    $group: {
      _id: {
        sender: "$sender",
        receiver: "$receiver",
        coin_code: "$coin_code",
        year: {
          $year: "$created_at",
        },
        month: {
          $month: "$created_at",
        },
      },
      total_amount: {
        $sum: "$transaction_amount",
      },
      transactions: {
        $push: "$$ROOT",
      },
      transaction_count: {
        $sum: 1,
      },
    },
  },
 
  {
    $project: {
      _id: 0,
      sender: "$_id.sender",
      receiver: "$_id.receiver",
      coin_code: "$_id.coin_code",
      year: "$_id.year",
      month: "$_id.month",
      total_amount: 1,
transaction_count:1,
      transactions: {
        $map: {
          input: "$transactions",
          as: "transaction",
          in: {
            transaction_amount: "$$transaction.transaction_amount",
            transaction_id: "$$transaction.transaction_id",
            created_at: "$$transaction.created_at",
            fundsource: "$$transaction.fundsource",
            internal_status: "$$transaction.internal_status",
            transaction_number: "$$transaction.transaction_number",
            transaction_usd_value: "$$transaction.transaction_usd_value",
            transaction_type: "$$transaction.transaction_type",
            systemTags: "$$transaction.systemTags",
          },
        },
      },
      transaction_count: 1,
      senderEmail: {
        $arrayElemAt: ["$transactions.senderEmail", 0],
      },
      receiverEmail: {
        $arrayElemAt: ["$transactions.receiverEmail", 0],
      },
      senderName: {
        $arrayElemAt: ["$transactions.senderName", 0],
      },
      receiverName: {
        $arrayElemAt: ["$transactions.receiverName", 0],
      },
      transaction_type: {
        $arrayElemAt: ["$transactions.transaction_type", 0],
      },
    },
  },
];
const groupTransactionFrequencyYear = [
  {
    $group: {
      _id: {
        sender: "$sender",
        receiver: "$receiver",
        coin_code: "$coin_code",
        year: {
          $year: "$created_at",
        },
      },
      total_amount: {
        $sum: "$transaction_amount",
      },
      transactions: {
        $push: "$$ROOT",
      },
      transaction_count: {
        $sum: 1,
      },
    },
  },
 
  {
    $project: {
      _id: 0,
      sender: "$_id.sender",
      filter:'year',
      receiver: "$_id.receiver",
      coin_code: "$_id.coin_code",
      year: "$_id.year",
      total_amount: 1,
      transaction_count:1,
      transactions: {
        $map: {
          input: "$transactions",
          as: "transaction",
          in: {
            transaction_amount: "$$transaction.transaction_amount",
            transaction_id: "$$transaction.transaction_id",
            created_at: "$$transaction.created_at",
            fundsource: "$$transaction.fundsource",
            internal_status: "$$transaction.internal_status",
            transaction_number: "$$transaction.transaction_number",
            transaction_usd_value: "$$transaction.transaction_usd_value",
            transaction_type: "$$transaction.transaction_type",
            systemTags: "$$transaction.systemTags",
          },
        },
      },
      transaction_count: 1,
      senderEmail: {
        $arrayElemAt: ["$transactions.senderEmail", 0],
      },
      receiverEmail: {
        $arrayElemAt: ["$transactions.receiverEmail", 0],
      },
      senderName: {
        $arrayElemAt: ["$transactions.senderName", 0],
      },
      receiverName: {
        $arrayElemAt: ["$transactions.receiverName", 0],
      },
      transaction_type: {
        $arrayElemAt: ["$transactions.transaction_type", 0],
      },
    },
  },
];
module.exports = {
  IXFI_NETWORK_REFUND,
  IXFIFILTER_REWARDS_AND_TYPE_INTERNAL_INTERNAL_TRANSAFRESPACE_NOTIN_WITH_TRANSACTION_NUM,
  addSenderToReceiver,
  AddReceiverInSender,
  mapSenderAndReceiverDetails,
  MaxTransaction,
  groupBasedOnTranSendAndRec,
  groupBasedOnRewardsRemoveDuplicate,
  groupOtherTransactionType,
  groupTransactionFrequency,
  groupTransactionFrequencyYear 
};
