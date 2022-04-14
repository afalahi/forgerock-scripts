# Shopify Multipass SSO Scripted Decision Node (Not supported in IDC yet)

## Summary

Shopify uses an authentication flow called Multipass for shop customers' SSO. The idea behind it is you use whatever Identity Provider you want, in this case forgerock, and then send an encrypted and signed base64 encoded JSON token with that user information. More details [here](https://shopify.dev/api/multipass)

## Setup

### Shopify Setup

#### Configuration

You'll need a Shopify dev account to test this flow.

- Navigate to [Shopify Dev](https://partners.shopify.com/signup/developer) to create a new account
- Once created and logged in you'll need to create a development store
  - From your Partner dashboard click Stores
  - Click Add store

    ![add-store](/JourneyScripts/Shopify/imgs/add-store.png)
  - Select Development Store for Store Type

    ![store-type](/JourneyScripts/Shopify/imgs/store-type.png)
  - Enter a name for your store and password. Development stores have passwords

    ![store-details](/JourneyScripts/Shopify/imgs/store-details.png)
  - You may need to enter an address for the store, so do so

    ![store-address](/JourneyScripts/Shopify/imgs/store-address.png)
  - Save
    - if you need to change the store passwords then follow these [steps](https://help.shopify.com/en/partners/dashboard/managing-stores/development-stores#viewing-or-setting-the-password)
- in your newly created store, we now need to enable Multipass
  - Login to your store

    ![store-login](/JourneyScripts/Shopify/imgs/store-login.png)
  - Click settings in left hand corner

    ![store-settings](/JourneyScripts/Shopify/imgs/store-settings.png)
  - Click checkout and from customer accounts choose accounts optional or required
  - Click on enable Multipass

    ![enable-multipass](/JourneyScripts/Shopify/imgs/store-enable-multipass.png)
  - Copy your multipass secret. `DO NOT COMMIT THIS SECRET IN YOUR CODE`

    ![copy-multipass](/JourneyScripts/Shopify/imgs/store-multipass.png)

#### Theme

We need to edit our Shopify theme and add our Forgerock configurations as well as edit the theme to redirect to Forgerock, and logout of Forgerock and Shopify in one swoop

While still in your store as admin:

- Click Themes

  ![store-themes](/JourneyScripts/Shopify/imgs/store-themes.png)
- Click Actions, and from the dropdown menu click **Edit Code**

  ![edit-theme-code](/JourneyScripts/Shopify/imgs/store-theme-code.png)
- Once you're in code mode click on **settings_schema.json**

  ![edit-theme-config](/JourneyScripts/Shopify/imgs/store-theme-config.png)
- Add the following code snippet to the bottom of the file. **Keep in mind this is a JSON array, so make sure to add it in side the array and don't forget the comma**

  ```json
    {
      "name": "Forgerock Config",
      "settings": [
        {
          "type": "text",
          "id": "forgerock_login_url",
          "label": "Forgerock Login Url",
          "info": "The full Forgerock tree url to redirect the customer to login."
        },
        {
          "type": "text",
          "id": "forgerock_logout_url",
          "label": "forgerock Logout Url",
          "info": "The full Forgerock URL to redirect the customer to for logout."
        }
      ]
    }
  ```

- Once you added the settings, locate the **customers/login.liquid** template.

  ![shopify-login-template](/JourneyScripts/Shopify/imgs/store-login-template.png)
- Add the following code to the top of the file, right after `{{ 'customer.css' | asset_url | stylesheet_tag }}`. This will check if a user is not logged in and redirect the user to forgerock

  ```liquid
  {% if customer.id == null %}
  <script>window.location.href="{{ settings.forgerock_login_url }}"</script>
  {% endif %}
  ```
  
  ![shopify-login-link](/JourneyScripts/Shopify/imgs/store-login-link.png)

- Locate the **customers/account.liquid** template

  ![shopify-account-template](/JourneyScripts/Shopify/imgs/store-account-template.png)
- Replace `{{ routes.account_logout_url }}` with our logout url

  ```liquid
  <a href="{{ settings.forgerock_logout_url }}">
  ```

  ![shopify-logout-link](/JourneyScripts/Shopify/imgs/store-logout-link.png)

#### Construct Your Urls

We've created a new config object in Shopify with two properties; `forgerock_login_url` and `forgerock_logout_url`. These two properties are key value pairs, and will hold values for our login and logout urls.

##### Login Url

  ```console
  https://YOUR_FORGEROCK_HOSTNAME/openam/XUI?authIndexType=service&authIndexValue=Shopify_MultiPass&return_to=YOUR_RETURN_TO_URL&ForceAuth=true#login
  ```

We're using `ForceAuth=true` to ensure that a user with a session will not be redirect to their dashboard and instead go through the journey so the script executes

##### Logout Url

```console
https://YOUR_FORGEROCK_HOSTNAM/openam/XUI?goto=https://forgerock-poc.myshopify.com/account/logout#logout
```

- `YOUR_FORGEROCK_HOSTNAME` = Whatever hostname you gave your deployment. My path has `/openam` in it, yours maybe different. You could be using a fully custom UI as well
- `YOUR_RETURN_TO_URL` = `https://your-shopify-domain/path`
  - This is an optional parameter that you can pass to AM and consume it from `requestParameters` in the Script. The script will add it to the encrypted JSON token so Shopify can redirect the user back to a specific page, like the cart page.
  - *This is set as a static value in this example implementation, but can be dynamic with JS manipulation on the Shopify side. That will not be covered here*

#### Add Urls in Shopify

Once you've figured out your URLs based on the above formula, you'll need to add them in our Shopify configuration object we created earlier.

While logged in to your store:

- Click themes

  ![store-themes](/JourneyScripts/Shopify/imgs/store-themes.png)
- Click **Customize**

  ![customize-theme](/JourneyScripts/Shopify/imgs/store-theme-customize.png)
- Click `Theme Settings` at the left hand corner

  ![theme-settings](/JourneyScripts/Shopify/imgs/store-theme-settings.png)
- You'll see a navigation menu open to the right, Click on **Forgerock Config**

  ![store-themes](/JourneyScripts/Shopify/imgs/store-theme-forgerock.png)
- Add your **Login** and **Logout** Urls and click **save**

### Forgerock Setup

#### Whitelist the Java classes

We need to whitelist the following classes in Forgerock Access Management

- Click to the target realm and click on **Configure** in the header menu > **Global Services**
- Scroll down and click on **Scripting** > **Secondary Configurations** > `AUTHENTICATION_TREE_DECISION_NODE` > **Secondary Configurations** > **engineConfiguration**
- Add the following Java classes

  ```js
  javax.crypto.Cipher
  javax.crypto.Mac
  javax.crypto.spec.SecretKeySpec
  java.security.MessageDigest
  java.lang.String
  java.security.SecureRandom
  javax.crypto.spec.IvParameterSpec
  java.io.ByteArrayOutputStream
  org.forgerock.util.encode.Base64
  ```

You may need to add these classes one by one and don't forget to save. Once added you need to restart the AM instance

#### Script

We'll need to create a script in Forgerock AM that will handle the encryption and signing of the Shopify payload and redirect users to their account page.

- Copy the [script](/JourneyScripts/Shopify/FR-ShopifyMultipass.js) from this repo
- Create a new Script
  - Scripts > New Script > **Name** the script **ShopifyMultipass** and Select **Decision node script for authentication trees** as type
  - Click create and pase your script, make sure the Language is **JavaScript**

#### Tree

Create a new Tree that will log the user in and redirect to Shopify

- **Authentication** > **Trees** > **Create Tree**
  - Name: **Shopify_MultiPass**
  - Add `Username Collector` Node or `Platform Username` node. This depends on your deployment
  - Add `Password Collector` Node or `Platform Password` Node. This depends on your deployment
  - Add `Scripted Decision` Node and choose our newly created Script
    - Change the Node name to **Shopify Multipass**
    - Add `true` in the Outcomes field
- Connect all Nodes as follows
  
    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/journey-view.png)
