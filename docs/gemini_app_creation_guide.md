# 🌐 Guide: Creating Apps with Gemini & EasyData (Bilingual)
### 🇬🇧 English & 🇮🇸 Íslenska

Welcome to the guide on how to build database-backed web applications directly inside **gemini.google.com** using the **EasyData Chrome Extension**. 

---

## 🇬🇧 English Guide

### 📥 Step 1: Install the EasyData Chrome Extension
Before Gemini can build hosted apps for you, you need to install the Chrome connector extension:
1. Open **Google Chrome** on your computer.
2. In the address bar, type `chrome://extensions/` and press **Enter**.
3. In the top-right corner, toggle on **Developer mode**.
4. In the top-left corner, click **Load unpacked**.
5. Navigate to your project folder and select the `chrome-extention` directory:
   * **Path**: `C:/Users/eldva/Documents/github/easydata/chrome-extention`
6. Click **Select Folder**. The extension **Gemini MCP Connector** will now appear in your list of active extensions.

---

### 💬 Step 2: Build the App in Gemini
Since the extension is active, it will automatically connect Gemini to the public database hosting service on **easydata.is**.

1. Go to [gemini.google.com](https://gemini.google.com).
2. Type your application request in the chat box. 
   * *Example*: **"Can you make me an app where students take pictures of their projects at home and turn them in so i can see them, and teachers can grade them"**
3. Press **Enter** to submit.
4. Gemini will receive instructions from the extension and automatically start calling the database tools to build your app:
   * It will create the application shell (`create_app`).
   * It will set up the database table structure (`create_table`).
   * It will write the HTML and publish the app (`publish_app`).
5. **Wait for Gemini to finish**: The Chrome extension will run these requests in the background. Once completed, Gemini will provide you with the **live URL** (e.g. `https://easydata.is/generated/uuid/`).

---

### 🔗 Sharing the App
* **Students**: Can open the generated URL on any device at home to fill in their name, notes, and upload project photos.
* **Teachers**: Can use the same link to switch to the **Teacher View** to review submissions, write feedback, and grade them.

---
---

## 🇮🇸 Íslenskar Leiðbeiningar

### 📥 Skref 1: Setja upp Chrome-viðbótina (Extension)
Til þess að Gemini geti búið til og hýst öpp fyrir þig þarftu fyrst að setja upp EasyData Chrome-viðbótina:
1. Opnaðu **Google Chrome** í tölvunni þinni.
2. Skrifaðu `chrome://extensions/` í vistfangastikuna (address bar) og ýttu á **Enter**.
3. Í efra hægra horninu, kveiktu á **Developer mode** (Hönnuðarhamur).
4. Í efra vinstra horninu, smelltu á **Load unpacked** (Hlaða ópökkuðu).
5. Finndu möppuna þar sem verkefnið er vistað og veldu `chrome-extention` möppuna:
   * **Slóð**: `C:/Users/eldva/Documents/github/easydata/chrome-extention`
6. Smelltu á **Select Folder** (Velja möppu). Viðbótin **Gemini MCP Connector** birtist nú á listanum yfir virkar viðbætur.

---

### 💬 Skref 2: Búa til appið í Gemini
Þegar viðbótin er virk mun hún sjálfkrafa tengja Gemini við gagnagrunnshýsinguna á **easydata.is**.

1. Farðu á vefsíðuna [gemini.google.com](https://gemini.google.com).
2. Skrifaðu lýsingu á appinu sem þig vantar í spjallboxið.
   * *Dæmi*: **"Geturðu búið til app handa mér þar sem nemendur geta tekið myndir af verkefnum sínum heima, sent þær inn svo ég geti skoðað þær, og kennarar geti gefið einkunnir"**
3. Ýttu á **Enter** til að senda.
4. Gemini fær sjálfkrafa fyrirmæli frá viðbótinni og byrjar að kalla á gagnagrunnsverkfærin til að hanna appið þitt:
   * Það býr til appið í kerfinu (`create_app`).
   * Það setur upp dálka og uppbyggingu gagnagrunnsins (`create_table`).
   * Það skrifar kóðann og birtir appið á netinu (`publish_app`).
5. **Bíddu eftir að spjallið klárast**: Chrome-viðbótin keyrir þessar beiðnir í bakgrunninum. Þegar ferlinu er lokið mun Gemini gefa þér **virka vefslóð** (t.d. `https://easydata.is/generated/uuid/`).

---

### 🔗 Deila appinu með nemendum
* **Nemendur**: Geta opnað slóðina í hvaða tæki sem er heima hjá sér til að skrifa nafnið sitt, setja inn athugasemdir og hlaða upp mynd af verkefninu sínu.
* **Kennarar**: Geta notað sömu slóð og skipt yfir í **Teacher View** (Kennaraviðmót) til að skoða verkefnin, skrifa umsagnir og gefa einkunnir.
