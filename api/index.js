const express = require("express");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} = require("firebase/firestore");

const app = express();
app.use(express.json());

// --- ដាក់ Firebase Config របស់អ្នកនៅទីនេះ ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ផ្លូវ (Route) សម្រាប់ទទួលទិន្នន័យពី MacroDroid
app.post("/api/aba-webhook", async (req, res) => {
  const notiText = req.body.text || "";
  console.log("សារទទួលបាន៖", notiText);

  let durationMonths = 0;
  let priceString = "";

  // ឆែករកតម្លៃកញ្ចប់ (ខ្មែរ និង អង់គ្លេស)
  if (notiText.includes("9.99")) {
    durationMonths = 1;
    priceString = "$9.99";
  } else if (notiText.includes("109.99")) {
    durationMonths = 12;
    priceString = "$109.99";
  } else if (notiText.includes("199.99")) {
    durationMonths = 24;
    priceString = "$199.99";
  }

  if (durationMonths > 0) {
    try {
      // ស្វែងរក User ដែលកំពុងរង់ចាំបង់ប្រាក់តាមតម្លៃនេះ
      const userQuery = query(
        collection(db, "users"),
        where("status", "==", "pending"),
        where("pendingAmount", "==", priceString)
      );

      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        return res
          .status(404)
          .send("រកមិនឃើញ User ដែលកំពុង Pending តម្លៃនេះទេ");
      }

      for (const userDoc of querySnapshot.docs) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getDate() + durationMonths * 30);

        await updateDoc(userDoc.ref, {
          status: "paid",
          plan: durationMonths + " ខែ",
          expiryDate: expiryDate,
          paidAt: new Date(),
        });
      }
      return res.status(200).send("Approved ជោគជ័យ!");
    } catch (error) {
      console.error(error);
      return res.status(500).send("Error updating Firebase");
    }
  }
  res.status(422).send("សារមិនមានតម្លៃទឹកប្រាក់ដែលត្រូវគ្នាទេ");
});

module.exports = app;
