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

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/add-store.png)
  - Select Development Store for Store Type

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-type.png)
  - Enter a name for your store and password. Development stores have passwords

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-details.png)
  - You may need to enter an address for the store, so do so

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-address.png)
  - Save
    - if you need to change the store passwords then follow these [steps](https://help.shopify.com/en/partners/dashboard/managing-stores/development-stores#viewing-or-setting-the-password)
- in your newly created store, we now need to enable Multipass
  - Login to your store

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-login.png)
  - Click settings in left hand corner

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-settings.png)
  - Click checkout and from customer accounts choose accounts optional or required
  - Click on enable Multipass

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-enable-multipass.png)
  - Copy your multipass secret. `DO NOT COMMIT THIS SECRET IN YOUR CODE`

    ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-multipass.png)

#### Theme

We need to edit our Shopify theme and add our Forgerock configurations as well as edit the theme to redirect to Forgerock, and logout of Forgerock and Shopify in one swoop

While still in your store as admin:

- Click Themes

  ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-themes.png)
- Click Actions, and from the dropdown menu click `Edit Code`

  ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-theme-code.png)
- Once you're in code mode click on `settings_schema.json`

  ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-theme-config.png)
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

- Once you added the settings, locate the `customers/login.liquid` template.

  ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/store-login-template.png)
- Add the following code to the top of the file, right after `{{ 'customer.css' | asset_url | stylesheet_tag }}`

  ```liquid
  {% if customer.id == null %}
  <script>window.location.href="{{ settings.forgerock_login_url }}"</script>
  {% endif %}
  ```

  - `YOUR_FORGEROCK_HOSTNAME` = Whatever hostname you gave your deployment. My path has `/openam` in it, yours maybe different. You could be using a fully custom UI as well
  - `YOUR_TREE_NAME` = Whatever you decided to call your AM tree/journey
  - `YOUR_RETURN_TO_URL` = This is an optional parameter that you can pass to AM and consume it from `requestParameters` in the Script. It will redirect the user back to a specific page in Shopify. 
    - *This is set as a static value in this example implementation, but can be dynamic with JS manipulation on the Shopify side. This will not be covered here*

```liquid
<a href="{{ settings.forgerock_logout_url }}">
```

```http
https://YOUR_FORGEROCK_HOSTNAME/openam/XUI?authIndexType=service&authIndexValue=YOUR_TREE_NAME&return_to=YOUT_RETURN_TO_URL&ForceAuth=true#login
```

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
  
  ![Shopify SSO Tree](/JourneyScripts/Shopify/imgs/journey-view.png)
