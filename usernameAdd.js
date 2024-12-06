exports.userNameDetailsAdd = function (
    platform,
    sender,
    receiver,
    senderName = "",
    receiverName = "",
    transactionType
  ) {
    const ixfiSenders = {
      "@IXFI-REWARDS": "IXFI Rewards",
      "@IXFI-REFERRAL-REWARDS": "IXFI Referral Rewards",
      "@IXFI-AFFILIATE_REWARDS": "IXFI Affiliate Rewards",
      "@IXFI NETWORK FEE REFUND": "IXFI Network Fee Refund",
    };
  
    const platformNames = {
      BINANCE: "Binance User",
      EXTERNAL: "External User",
      SUPER_EXTERNAL: "Super External User",
    };
  
    let defaultName = "";
  
    // Check if sender or receiver matches platform-specific defaults
    if (platform === "IXFI" && ixfiSenders[sender]) {
      defaultName = ixfiSenders[sender];
    } else if (platform === "IXFI" && ixfiSenders[receiver]) {
      defaultName = ixfiSenders[receiver];
    } else {
      defaultName = platformNames[platform] || null;
    }
  
    // Assign names based on transaction type
    if (transactionType === "send") {
      receiverName = defaultName || receiverName; // Default name for receiver if sending
    } else if (transactionType === "receive") {
      senderName = defaultName || senderName; // Default name for sender if receiving
    } else if (transactionType === "network_fee_refund") {
      senderName = "IXFI Network Fee Refund";
    }
  
    // Return final names
    return { senderName, receiverName };
  }
  