# Shopify Multipass SSO Scripted Decision Node

## Summary

Shopify uses an authentication flow called Multipass for shop customers' SSO. The idea behind it is you use whatever Identity Provider you want, in this case forgerock, and then send an encrypted and signed base64 encoded JSON token with that user information. More details [here](https://shopify.dev/api/multipass)

## Setup

### Shopify Setup

You'll need a Shopify dev account to test this flow.

- Navigate to [Shopify Dev](https://partners.shopify.com/signup/developer) to create a new account
- Once created and logged in you'll need to create a development store
  - From your Partner dashboard click Stores
  - Click Add store
  - Select Development Store for Store Type
  - Enter a name for your store and password. Development stores have passwords
  - You may need to enter an address for the store, so do so
  - Save
    - if you need to change the store passwords then follow these [steps](https://help.shopify.com/en/partners/dashboard/managing-stores/development-stores#viewing-or-setting-the-password)
- in your newly created store, we now need to enable Multipass
  - While logged in to your dev store, click settings at the left hand corner
  - click checkout and from customer accounts choose accounts optional or required
  - Copy your multipass secret. `DO NOT COMMIT THIS SECRET IN YOUR CODE`

### Forgerock Setup

#### Whitelist the Java classes

We need to whitelist the following classes in Forgerock Access Management

- Click to the target realm and click on `Configure` in the header menu > `Global Services`
- Scroll down and click on `Scripting` > `Secondary Configurations` > `AUTHENTICATION_TREE_DECISION_NODE` > `Secondary Configurations` > `engineConfiguration`
- Add the following Java classes

  ```java
  javax.crypto.Cipher
  javax.crypto.Mac
  javax.crypto.spec.SecretKeySpec
  java.security.MessageDigest
  java.lang.String
  java.security.SecureRandom
  javax.crypto.spec.IvParameterSpec
  java.util.Arrays
  java.io.ByteArrayOutputStream
  org.forgerock.util.encode.Base64
  ```

You may need to add these classes one by one and don't forget to save

#### Script Configuration

We'll need to create a script in Forgerock AM that will handle the encryption and signing of the Shopify payload and redirect users to their account page.

- Copy the [script](/JourneyScripts/Shopify/FR-ShopifyMultipass.js) from this repo
- Create a new Script
  - Scripts > New Script > `Name` the script "ShopifyMultipass" and Select Decision node script for authentication trees as `type`
  - Click create and pase your script, make sure the `Language` is JavaScript
- Create a new Tree that will log the user in and redirect to Shopify
  - Authentication > Trees > Create Tree
    - Name: Shopify_MultiPass
    - Add `Username Collector` Node or `Platform Username` node. This depends on your deployment
    - Add `Scripted Decision` Node and choose our newly created Script
      - Change the Node name to `Shopify Multipass Script`
      - Add `true` in the Outcomes field
  - Connect all Nodes as follows
  
  ![Shopify SSO Tree](/JourneyScripts/Shopify/msedge_2022-04-11_11-25-16.png)
