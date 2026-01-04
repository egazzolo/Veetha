import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';

export default function PrivacyPolicyScreen({ route }) {
  const { theme } = useTheme();
  const { initialTab = 'privacy' } = route.params || {};
  const [showTerms, setShowTerms] = useState(initialTab === 'terms');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Toggle Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, !showTerms && styles.tabActive]} 
          onPress={() => setShowTerms(false)}
        >
          <Text style={[styles.tabText, !showTerms && styles.tabTextActive]}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, showTerms && styles.tabActive]} 
          onPress={() => setShowTerms(true)}
        >
          <Text style={[styles.tabText, showTerms && styles.tabTextActive]}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {showTerms ? (
          /* TERMS OF SERVICE */
          <>
            <Text style={[styles.title, { color: theme.text }]}>Terms of Service</Text>
            <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
              Last Updated: December 22, 2024
            </Text>
            <View style={styles.divider} />
            <Text style={[styles.bodyText, { color: theme.text }]}>
{`TERMS OF SERVICE
Last updated December 01, 2025



These Terms of Service are provided in English only. 
By using this app, you agree to these terms in English.

Estos Términos de Servicio se proporcionan solo en inglés.
Ces Conditions d'Utilisation sont fournies en anglais uniquement.
Ang mga Tuntunin ng Serbisyo ay ibinibigay sa Ingles lamang.


AGREEMENT TO OUR LEGAL TERMS
We are Enzo Gazzolo, doing business as Veetha ("Company," "we," "us," "our"), a company registered inTexas, United States  at 1350 SONNY DR, Leander, TX 78641.

We operate the mobile application Veetha (the "App"), as well as any other related products and services that refer or link to these legal terms (the "Legal Terms") (collectively, the "Services").

The app measures daily consumption of macro nutrients by scanning barcodes, taking pictures of meals or manual entry. The app also provides meal recommendations that align with the user's specifications in preference and restrictions.

You can contact us by email at veetha.app@gmail.com, or by mail to 1350 SONNY DR, apt 12300, Leander, TX 78641, United States.

These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you"), and Enzo Gazzolo, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.

We will provide you with prior notice of any scheduled changes to the Services you are using. The modified Legal Terms will become effective upon posting or notifying you by email at least 30 days in advance, as stated in the email message. By continuing to use the Services after the effective date of any changes, you agree to be bound by the modified terms.

The Services are intended for users who are at least 13 years of age. All users who are minors in the jurisdiction in which they reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to use the Services. If you are a minor, you must have your parent or guardian read and agree to these Legal Terms prior to you using the Services.

We recommend that you print a copy of these Legal Terms for your records.

TABLE OF CONTENTS
1. OUR SERVICES
2. INTELLECTUAL PROPERTY RIGHTS
3. USER REPRESENTATIONS
4. USER REGISTRATION
5. PURCHASES AND PAYMENT
6. SUBSCRIPTIONS
7. SOFTWARE
8. PROHIBITED ACTIVITIES
9. USER GENERATED CONTRIBUTIONS
10. CONTRIBUTION LICENSE
11. GUIDELINES FOR REVIEWS
12. MOBILE APPLICATION LICENSE
13. SOCIAL MEDIA
14. THIRD-PARTY WEBSITES AND CONTENT
15. ADVERTISERS
16. SERVICES MANAGEMENT
17. PRIVACY POLICY
18. TERM AND TERMINATION
19. MODIFICATIONS AND INTERRUPTIONS
20. GOVERNING LAW
21. DISPUTE RESOLUTION
22. CORRECTIONS
23. DISCLAIMER
24. LIMITATIONS OF LIABILITY
25. INDEMNIFICATION
26. USER DATA
27. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES
28. CALIFORNIA USERS AND RESIDENTS
29. MISCELLANEOUS
30. MEDICAL DISCLAIMER
31. AI PHOTO RECOGNITION ACCURACY
32. USER-GENERATED CONTENT AND PHOTO USAGE
33. FREE AND PREMIUM FEATURES
34. CONTACT US

1. OUR SERVICES
The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable.

The Services are not tailored to comply with industry-specific regulations (Health Insurance Portability and Accountability Act (HIPAA), Federal Information Security Management Act (FISMA), etc.), so if your interactions would be subjected to such laws, you may not use the Services. You may not use the Services in a way that would violate the Gramm-Leach-Bliley Act (GLBA).

2. INTELLECTUAL PROPERTY RIGHTS
Our intellectual property
We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").

Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) and treaties in the United States and around the world.

The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use only.
Your use of our Services
Subject to your compliance with these Legal Terms, including the "PROHIBITED ACTIVITIES" section below, we grant you a non-exclusive, non-transferable, revocable license to:
	access the Services; and
	download or print a copy of any portion of the Content to which you have properly gained access,
solely for your personal, non-commercial use.

Except as set out in this section or elsewhere in our Legal Terms, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.

If you wish to make any use of the Services, Content, or Marks other than as set out in this section or elsewhere in our Legal Terms, please address your request to: veetha.app@gmail.com. If we ever grant you the permission to post, reproduce, or publicly display any part of our Services or Content, you must identify us as the owners or licensors of the Services, Content, or Marks and ensure that any copyright or proprietary notice appears or is visible on posting, reproducing, or displaying our Content.

We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.

Any breach of these Intellectual Property Rights will constitute a material breach of our Legal Terms and your right to use our Services will terminate immediately.
Your submissions
Please review this section and the "PROHIBITED ACTIVITIES" section carefully prior to using our Services to understand the (a) rights you give us and (b) obligations you have when you post or upload any content through the Services.

Submissions: By directly sending us any question, comment, suggestion, idea, feedback, or other information about the Services ("Submissions"), you agree to assign to us all intellectual property rights in such Submission. You agree that we shall own this Submission and be entitled to its unrestricted use and dissemination for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.

You are responsible for what you post or upload: By sending us Submissions through any part of the Services you:
	confirm that you have read and agree with our "PROHIBITED ACTIVITIES" and will not post, send, publish, upload, or transmit through the Services any Submission that is illegal, harassing, hateful, harmful, defamatory, obscene, bullying, abusive, discriminatory, threatening to any person or group, sexually explicit, false, inaccurate, deceitful, or misleading;
	to the extent permissible by applicable law, waive any and all moral rights to any such Submission;
	warrant that any such Submission are original to you or that you have the necessary rights and licenses to submit such Submissions and that you have full authority to grant us the above-mentioned rights in relation to your Submissions; and
	warrant and represent that your Submissions do not constitute confidential information.
You are solely responsible for your Submissions and you expressly agree to reimburse us for any and all losses that we may suffer because of your breach of (a) this section, (b) any third party’s intellectual property rights, or (c) applicable law.

3. USER REPRESENTATIONS
By using the Services, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Legal Terms; (4) you are not under the age of 13; (5) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services; (6) you will not access the Services through automated or non-human means, whether through a bot, script or otherwise; (7) you will not use the Services for any illegal or unauthorized purpose; and (8) your use of the Services will not violate any applicable law or regulation.

If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Services (or any portion thereof).

4. USER REGISTRATION
You may be required to register to use the Services. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.

5. PURCHASES AND PAYMENT
We accept the following forms of payment:

-  Visa
-  Mastercard
-  American Express
-  Discover
-  PayPal

You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Services. You further agree to promptly update account and payment information, including email address, payment method, and payment card expiration date, so that we can complete your transactions and contact you as needed. Sales tax will be added to the price of purchases as deemed required by us. We may change prices at any time. All payments shall be in US dollars.

You agree to pay all charges at the prices then in effect for your purchases and any applicable shipping fees, and you authorize us to charge your chosen payment provider for any such amounts upon placing your order. We reserve the right to correct any errors or mistakes in pricing, even if we have already requested or received payment.

We reserve the right to refuse any order placed through the Services. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order. These restrictions may include orders placed by or under the same customer account, the same payment method, and/or orders that use the same billing or shipping address. We reserve the right to limit or prohibit orders that, in our sole judgment, appear to be placed by dealers, resellers, or distributors.

6. SUBSCRIPTIONS
Billing and Renewal
Your subscription will continue and automatically renew unless canceled. You consent to our charging your payment method on a recurring basis without requiring your prior approval for each recurring charge, until such time as you cancel the applicable order. The length of your billing cycle will depend on the type of subscription plan you choose when you subscribed to the Services.
Cancellation
All purchases are non-refundable. You can cancel your subscription at any time by logging into your account. Your cancellation will take effect at the end of the current paid term. If you have any questions or are unsatisfied with our Services, please email us at veetha.app@gmail.com.
Fee Changes
We may, from time to time, make changes to the subscription fee and will communicate any price changes to you in accordance with applicable law.

7. SOFTWARE
We may include software for use in connection with our Services. If such software is accompanied by an end user license agreement ("EULA"), the terms of the EULA will govern your use of the software. If such software is not accompanied by a EULA, then we grant to you a non-exclusive, revocable, personal, and non-transferable license to use such software solely in connection with our services and in accordance with these Legal Terms. Any software and any related documentation is provided "AS IS" without warranty of any kind, either express or implied, including, without limitation, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement. You accept any and all risk arising out of use or performance of any software. You may not reproduce or redistribute any software except in accordance with the EULA or these Legal Terms.

8. PROHIBITED ACTIVITIES
You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.

As a user of the Services, you agree not to:
	Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.
	Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.
	Circumvent, disable, or otherwise interfere with security-related features of the Services, including features that prevent or restrict the use or copying of any Content or enforce limitations on the use of the Services and/or the Content contained therein.
	Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.
	Use any information obtained from the Services in order to harass, abuse, or harm another person.
	Make improper use of our support services or submit false reports of abuse or misconduct.
	Use the Services in a manner inconsistent with any applicable laws or regulations.
	Engage in unauthorized framing of or linking to the Services.
	Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material, including excessive use of capital letters and spamming (continuous posting of repetitive text), that interferes with any party’s uninterrupted use and enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the use, features, functions, operation, or maintenance of the Services.
	Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.
	Delete the copyright or other proprietary rights notice from any Content.
	Attempt to impersonate another user or person or use the username of another user.
	Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism, including without limitation, clear graphics interchange formats ("gifs"), 1×1 pixels, web bugs, cookies, or other similar devices (sometimes referred to as "spyware" or "passive collection mechanisms" or "pcms").
	Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.
	Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.
	Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.
	Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.
	Except as permitted by applicable law, decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services.
	Except as may be the result of standard search engine or Internet browser usage, use, launch, develop, or distribute any automated system, including without limitation, any spider, robot, cheat utility, scraper, or offline reader that accesses the Services, or use or launch any unauthorized script or other software.
	Use a buying agent or purchasing agent to make purchases on the Services.
	Make any unauthorized use of the Services, including collecting usernames and/or email addresses of users by electronic or other means for the purpose of sending unsolicited email, or creating user accounts by automated means or under false pretenses.
	Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.
	Use the Services to advertise or offer to sell goods and services.
	Sell or otherwise transfer your profile.
	Use the app to provide medical advice or diagnosis to other users.
	Intentionally submit false or misleading nutrition information.
	Upload inappropriate, offensive, or non-food-related images.
	Attempt to reverse engineer, decompile, or extract the app's source code.
	Use the app if under 13 years of age.
	Share login credentials or allow others to access your account.
	Use automated tools, bots, or scripts to interact with the app.

9. USER GENERATED CONTRIBUTIONS
The Services does not offer users to submit or post content. We may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Services, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, "Contributions"). Contributions may be viewable by other users of the Services and through third-party websites. When you create or make available any Contributions, you thereby represent and warrant that:
	The creation, distribution, transmission, public display, or performance, and the accessing, downloading, or copying of your Contributions do not and will not infringe the proprietary rights, including but not limited to the copyright, patent, trademark, trade secret, or moral rights of any third party.
	You are the creator and owner of or have the necessary licenses, rights, consents, releases, and permissions to use and to authorize us, the Services, and other users of the Services to use your Contributions in any manner contemplated by the Services and these Legal Terms.
	You have the written consent, release, and/or permission of each and every identifiable individual person in your Contributions to use the name or likeness of each and every such identifiable individual person to enable inclusion and use of your Contributions in any manner contemplated by the Services and these Legal Terms.
	Your Contributions are not false, inaccurate, or misleading.
	Your Contributions are not unsolicited or unauthorized advertising, promotional materials, pyramid schemes, chain letters, spam, mass mailings, or other forms of solicitation.
	Your Contributions are not obscene, lewd, lascivious, filthy, violent, harassing, libelous, slanderous, or otherwise objectionable (as determined by us).
	Your Contributions do not ridicule, mock, disparage, intimidate, or abuse anyone.
	Your Contributions are not used to harass or threaten (in the legal sense of those terms) any other person and to promote violence against a specific person or class of people.
	Your Contributions do not violate any applicable law, regulation, or rule.
	Your Contributions do not violate the privacy or publicity rights of any third party.
	Your Contributions do not violate any applicable law concerning child pornography, or otherwise intended to protect the health or well-being of minors.
	Your Contributions do not include any offensive comments that are connected to race, national origin, gender, sexual preference, or physical handicap.
	Your Contributions do not otherwise violate, or link to material that violates, any provision of these Legal Terms, or any applicable law or regulation.
Any use of the Services in violation of the foregoing violates these Legal Terms and may result in, among other things, termination or suspension of your rights to use the Services.

10. CONTRIBUTION LICENSE
You and Services agree that we may access, store, process, and use any information and personal data that you provide and your choices (including settings).

By submitting suggestions or other feedback regarding the Services, you agree that we can use and share such feedback for any purpose without compensation to you.

We do not assert any ownership over your Contributions. You retain full ownership of all of your Contributions and any intellectual property rights or other proprietary rights associated with your Contributions. We are not liable for any statements or representations in your Contributions provided by you in any area on the Services. You are solely responsible for your Contributions to the Services and you expressly agree to exonerate us from any and all responsibility and to refrain from any legal action against us regarding your Contributions.

11. GUIDELINES FOR REVIEWS
We may provide you areas on the Services to leave reviews or ratings. When posting a review, you must comply with the following criteria: (1) you should have firsthand experience with the person/entity being reviewed; (2) your reviews should not contain offensive profanity, or abusive, racist, offensive, or hateful language; (3) your reviews should not contain discriminatory references based on religion, race, gender, national origin, age, marital status, sexual orientation, or disability; (4) your reviews should not contain references to illegal activity; (5) you should not be affiliated with competitors if posting negative reviews; (6) you should not make any conclusions as to the legality of conduct; (7) you may not post any false or misleading statements; and (8) you may not organize a campaign encouraging others to post reviews, whether positive or negative.

We may accept, reject, or remove reviews in our sole discretion. We have absolutely no obligation to screen reviews or to delete reviews, even if anyone considers reviews objectionable or inaccurate. Reviews are not endorsed by us, and do not necessarily represent our opinions or the views of any of our affiliates or partners. We do not assume liability for any review or for any claims, liabilities, or losses resulting from any review. By posting a review, you hereby grant to us a perpetual, non-exclusive, worldwide, royalty-free, fully paid, assignable, and sublicensable right and license to reproduce, modify, translate, transmit by any means, display, perform, and/or distribute all content relating to review.

12. MOBILE APPLICATION LICENSE
Use License
If you access the Services via the App, then we grant you a revocable, non-exclusive, non-transferable, limited right to install and use the App on wireless electronic devices owned or controlled by you, and to access and use the App on such devices strictly in accordance with the terms and conditions of this mobile application license contained in these Legal Terms. You shall not: (1) except as permitted by applicable law, decompile, reverse engineer, disassemble, attempt to derive the source code of, or decrypt the App; (2) make any modification, adaptation, improvement, enhancement, translation, or derivative work from the App; (3) violate any applicable laws, rules, or regulations in connection with your access or use of the App; (4) remove, alter, or obscure any proprietary notice (including any notice of copyright or trademark) posted by us or the licensors of the App; (5) use the App for any revenue-generating endeavor, commercial enterprise, or other purpose for which it is not designed or intended; (6) make the App available over a network or other environment permitting access or use by multiple devices or users at the same time; (7) use the App for creating a product, service, or software that is, directly or indirectly, competitive with or in any way a substitute for the App; (8) use the App to send automated queries to any website or to send any unsolicited commercial email; or (9) use any proprietary information or any of our interfaces or our other intellectual property in the design, development, manufacture, licensing, or distribution of any applications, accessories, or devices for use with the App.
Apple and Android Devices
The following terms apply when you use the App obtained from either the Apple Store or Google Play (each an "App Distributor") to access the Services: (1) the license granted to you for our App is limited to a non-transferable license to use the application on a device that utilizes the Apple iOS or Android operating systems, as applicable, and in accordance with the usage rules set forth in the applicable App Distributor’s terms of service; (2) we are responsible for providing any maintenance and support services with respect to the App as specified in the terms and conditions of this mobile application license contained in these Legal Terms or as otherwise required under applicable law, and you acknowledge that each App Distributor has no obligation whatsoever to furnish any maintenance and support services with respect to the App; (3) in the event of any failure of the App to conform to any applicable warranty, you may notify the applicable App Distributor, and the App Distributor, in accordance with its terms and policies, may refund the purchase price, if any, paid for the App, and to the maximum extent permitted by applicable law, the App Distributor will have no other warranty obligation whatsoever with respect to the App; (4) you represent and warrant that (i) you are not located in a country that is subject to a US government embargo, or that has been designated by the US government as a "terrorist supporting" country and (ii) you are not listed on any US government list of prohibited or restricted parties; (5) you must comply with applicable third-party terms of agreement when using the App, e.g., if you have a VoIP application, then you must not be in violation of their wireless data service agreement when using the App; and (6) you acknowledge and agree that the App Distributors are third-party beneficiaries of the terms and conditions in this mobile application license contained in these Legal Terms, and that each App Distributor will have the right (and will be deemed to have accepted the right) to enforce the terms and conditions in this mobile application license contained in these Legal Terms against you as a third-party beneficiary thereof.

13. SOCIAL MEDIA
As part of the functionality of the Services, you may link your account with online accounts you have with third-party service providers (each such account, a "Third-Party Account") by either: (1) providing your Third-Party Account login information through the Services; or (2) allowing us to access your Third-Party Account, as is permitted under the applicable terms and conditions that govern your use of each Third-Party Account. You represent and warrant that you are entitled to disclose your Third-Party Account login information to us and/or grant us access to your Third-Party Account, without breach by you of any of the terms and conditions that govern your use of the applicable Third-Party Account, and without obligating us to pay any fees or making us subject to any usage limitations imposed by the third-party service provider of the Third-Party Account. By granting us access to any Third-Party Accounts, you understand that (1) we may access, make available, and store (if applicable) any content that you have provided to and stored in your Third-Party Account (the "Social Network Content") so that it is available on and through the Services via your account, including without limitation any friend lists and (2) we may submit to and receive from your Third-Party Account additional information to the extent you are notified when you link your account with the Third-Party Account. Depending on the Third-Party Accounts you choose and subject to the privacy settings that you have set in such Third-Party Accounts, personally identifiable information that you post to your Third-Party Accounts may be available on and through your account on the Services. Please note that if a Third-Party Account or associated service becomes unavailable or our access to such Third-Party Account is terminated by the third-party service provider, then Social Network Content may no longer be available on and through the Services. You will have the ability to disable the connection between your account on the Services and your Third-Party Accounts at any time. PLEASE NOTE THAT YOUR RELATIONSHIP WITH THE THIRD-PARTY SERVICE PROVIDERS ASSOCIATED WITH YOUR THIRD-PARTY ACCOUNTS IS GOVERNED SOLELY BY YOUR AGREEMENT(S) WITH SUCH THIRD-PARTY SERVICE PROVIDERS. We make no effort to review any Social Network Content for any purpose, including but not limited to, for accuracy, legality, or non-infringement, and we are not responsible for any Social Network Content. You acknowledge and agree that we may access your email address book associated with a Third-Party Account and your contacts list stored on your mobile device or tablet computer solely for purposes of identifying and informing you of those contacts who have also registered to use the Services. You can deactivate the connection between the Services and your Third-Party Account by contacting us using the contact information below or through your account settings (if applicable). We will attempt to delete any information stored on our servers that was obtained through such Third-Party Account, except the username and profile picture that become associated with your account.

14. THIRD-PARTY WEBSITES AND CONTENT
The Services may contain (or you may be sent via the App) links to other websites ("Third-Party Websites") as well as articles, photographs, text, graphics, pictures, designs, music, sound, video, information, applications, software, and other content or items belonging to or originating from third parties ("Third-Party Content"). Such Third-Party Websites and Third-Party Content are not investigated, monitored, or checked for accuracy, appropriateness, or completeness by us, and we are not responsible for any Third-Party Websites accessed through the Services or any Third-Party Content posted on, available through, or installed from the Services, including the content, accuracy, offensiveness, opinions, reliability, privacy practices, or other policies of or contained in the Third-Party Websites or the Third-Party Content. Inclusion of, linking to, or permitting the use or installation of any Third-Party Websites or any Third-Party Content does not imply approval or endorsement thereof by us. If you decide to leave the Services and access the Third-Party Websites or to use or install any Third-Party Content, you do so at your own risk, and you should be aware these Legal Terms no longer govern. You should review the applicable terms and policies, including privacy and data gathering practices, of any website to which you navigate from the Services or relating to any applications you use or install from the Services. Any purchases you make through Third-Party Websites will be through other websites and from other companies, and we take no responsibility whatsoever in relation to such purchases which are exclusively between you and the applicable third party. You agree and acknowledge that we do not endorse the products or services offered on Third-Party Websites and you shall hold us blameless from any harm caused by your purchase of such products or services. Additionally, you shall hold us blameless from any losses sustained by you or harm caused to you relating to or resulting in any way from any Third-Party Content or any contact with Third-Party Websites.

15. ADVERTISERS
We allow advertisers to display their advertisements and other information in certain areas of the Services, such as sidebar advertisements or banner advertisements. We simply provide the space to place such advertisements, and we have no other relationship with advertisers.

16. SERVICES MANAGEMENT
We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms; (2) take appropriate legal action against anyone who, in our sole discretion, violates the law or these Legal Terms, including without limitation, reporting such user to law enforcement authorities; (3) in our sole discretion and without limitation, refuse, restrict access to, limit the availability of, or disable (to the extent technologically feasible) any of your Contributions or any portion thereof; (4) in our sole discretion and without limitation, notice, or liability, to remove from the Services or otherwise disable all files and content that are excessive in size or are in any way burdensome to our systems; and (5) otherwise manage the Services in a manner designed to protect our rights and property and to facilitate the proper functioning of the Services.

17. PRIVACY POLICY
We care about data privacy and security. By using the Services, you agree to be bound by our Privacy Policy posted on the Services, which is incorporated into these Legal Terms. Please be advised the Services are hosted in Peru and United States. If you access the Services from any other region of the world with laws or other requirements governing personal data collection, use, or disclosure that differ from applicable laws in Peru and United States, then through your continued use of the Services, you are transferring your data to Peru and United States, and you expressly consent to have your data transferred to and processed in Peru and United States. Further, we do not knowingly accept, request, or solicit information from children or knowingly market to children. Therefore, in accordance with the U.S. Children’s Online Privacy Protection Act, if we receive actual knowledge that anyone under the age of 13 has provided personal information to us without the requisite and verifiable parental consent, we will delete that information from the Services as quickly as is reasonably practical.

18. TERM AND TERMINATION
These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE YOUR ACCOUNT AND ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME, WITHOUT WARNING, IN OUR SOLE DISCRETION.

If we terminate or suspend your account for any reason, you are prohibited from registering and creating a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party. In addition to terminating or suspending your account, we reserve the right to take appropriate legal action, including without limitation pursuing civil, criminal, and injunctive redress.

19. MODIFICATIONS AND INTERRUPTIONS
We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Services. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Services.

We cannot guarantee the Services will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the Services, resulting in interruptions, delays, or errors. We reserve the right to change, revise, update, suspend, discontinue, or otherwise modify the Services at any time or for any reason without notice to you. You agree that we have no liability whatsoever for any loss, damage, or inconvenience caused by your inability to access or use the Services during any downtime or discontinuance of the Services. Nothing in these Legal Terms will be construed to obligate us to maintain and support the Services or to supply any corrections, updates, or releases in connection therewith.

20. GOVERNING LAW
These Legal Terms and your use of the Services are governed by and construed in accordance with the laws of the State of __________ applicable to agreements made and to be entirely performed within the State of __________, without regard to its conflict of law principles.

21. DISPUTE RESOLUTION
Informal Negotiations
To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms (each a "Dispute" and collectively, the "Disputes") brought by either you or us (individually, a "Party" and collectively, the "Parties"), the Parties agree to first attempt to negotiate any Dispute (except those Disputes expressly provided below) informally for at least thirty (30) days before initiating arbitration. Such informal negotiations commence upon written notice from one Party to the other Party.
Binding Arbitration
If the Parties are unable to resolve a Dispute through informal negotiations, the Dispute (except those Disputes expressly excluded below) will be finally and exclusively resolved by binding arbitration. YOU UNDERSTAND THAT WITHOUT THIS PROVISION, YOU WOULD HAVE THE RIGHT TO SUE IN COURT AND HAVE A JURY TRIAL. The arbitration shall be commenced and conducted under the Commercial Arbitration Rules of the American Arbitration Association ("AAA") and, where appropriate, the AAA’s Supplementary Procedures for Consumer Related Disputes ("AAA Consumer Rules"), both of which are available at the American Arbitration Association (AAA) website. Your arbitration fees and your share of arbitrator compensation shall be governed by the AAA Consumer Rules and, where appropriate, limited by the AAA Consumer Rules. If such costs are determined by the arbitrator to be excessive, we will pay all arbitration fees and expenses. The arbitration may be conducted in person, through the submission of documents, by phone, or online. The arbitrator will make a decision in writing, but need not provide a statement of reasons unless requested by either Party. The arbitrator must follow applicable law, and any award may be challenged if the arbitrator fails to do so. Except where otherwise required by the applicable AAA rules or applicable law, the arbitration will take place in New Castle County, Delaware. Except as otherwise provided herein, the Parties may litigate in court to compel arbitration, stay proceedings pending arbitration, or to confirm, modify, vacate, or enter judgment on the award entered by the arbitrator.

If for any reason, a Dispute proceeds in court rather than arbitration, the Dispute shall be commenced or prosecuted in the  state and federal courts located in New Castle County, Delaware, and the Parties hereby consent to, and waive all defenses of lack of personal jurisdiction, and forum non conveniens with respect to venue and jurisdiction in such state and federal courts. Application of the United Nations Convention on Contracts for the International Sale of Goods and the Uniform Computer Information Transaction Act (UCITA) are excluded from these Legal Terms.

In no event shall any Dispute brought by either Party related in any way to the Services be commenced more than one (1) years after the cause of action arose. If this provision is found to be illegal or unenforceable, then neither Party will elect to arbitrate any Dispute falling within that portion of this provision found to be illegal or unenforceable and such Dispute shall be decided by a court of competent jurisdiction within the courts listed for jurisdiction above, and the Parties agree to submit to the personal jurisdiction of that court.
Restrictions
The Parties agree that any arbitration shall be limited to the Dispute between the Parties individually. To the full extent permitted by law, (a) no arbitration shall be joined with any other proceeding; (b) there is no right or authority for any Dispute to be arbitrated on a class-action basis or to utilize class action procedures; and (c) there is no right or authority for any Dispute to be brought in a purported representative capacity on behalf of the general public or any other persons.
Exceptions to Informal Negotiations and Arbitration
The Parties agree that the following Disputes are not subject to the above provisions concerning informal negotiations binding arbitration: (a) any Disputes seeking to enforce or protect, or concerning the validity of, any of the intellectual property rights of a Party; (b) any Dispute related to, or arising from, allegations of theft, piracy, invasion of privacy, or unauthorized use; and (c) any claim for injunctive relief. If this provision is found to be illegal or unenforceable, then neither Party will elect to arbitrate any Dispute falling within that portion of this provision found to be illegal or unenforceable and such Dispute shall be decided by a court of competent jurisdiction within the courts listed for jurisdiction above, and the Parties agree to submit to the personal jurisdiction of that court.

22. CORRECTIONS
There may be information on the Services that contains typographical errors, inaccuracies, or omissions, including descriptions, pricing, availability, and various other information. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the Services at any time, without prior notice.

23. DISCLAIMER
THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT OR THE CONTENT OF ANY WEBSITES OR MOBILE APPLICATIONS LINKED TO THE SERVICES AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (3) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (4) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (5) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH THE SERVICES BY ANY THIRD PARTY, AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES. WE DO NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE SERVICES, ANY HYPERLINKED WEBSITE, OR ANY WEBSITE OR MOBILE APPLICATION FEATURED IN ANY BANNER OR OTHER ADVERTISING, AND WE WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND ANY THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE.
Exercise calorie estimates are approximations based on MET values. Actual calories burned may vary. Consult a doctor before starting any exercise program.

24. LIMITATIONS OF LIABILITY
IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID, IF ANY, BY YOU TO US DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING. CERTAIN US STATE LAWS AND INTERNATIONAL LAWS DO NOT ALLOW LIMITATIONS ON IMPLIED WARRANTIES OR THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS APPLY TO YOU, SOME OR ALL OF THE ABOVE DISCLAIMERS OR LIMITATIONS MAY NOT APPLY TO YOU, AND YOU MAY HAVE ADDITIONAL RIGHTS.

25. INDEMNIFICATION
You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys’ fees and expenses, made by any third party due to or arising out of: (1) use of the Services; (2) breach of these Legal Terms; (3) any breach of your representations and warranties set forth in these Legal Terms; (4) your violation of the rights of a third party, including but not limited to intellectual property rights; or (5) any overt harmful act toward any other user of the Services with whom you connected via the Services. Notwithstanding the foregoing, we reserve the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify us, and you agree to cooperate, at your expense, with our defense of such claims. We will use reasonable efforts to notify you of any such claim, action, or proceeding which is subject to this indemnification upon becoming aware of it.

26. USER DATA
We will maintain certain data that you transmit to the Services for the purpose of managing the performance of the Services, as well as data relating to your use of the Services. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Services. You agree that we shall have no liability to you for any loss or corruption of any such data, and you hereby waive any right of action against us arising from any such loss or corruption of such data.

27. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES
Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and other communications we provide to you electronically, via email and on the Services, satisfy any legal requirement that such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES. You hereby waive any rights or requirements under any statutes, regulations, rules, ordinances, or other laws in any jurisdiction which require an original signature or delivery or retention of non-electronic records, or to payments or the granting of credits by any means other than electronic means.

28. CALIFORNIA USERS AND RESIDENTS
If any complaint with us is not satisfactorily resolved, you can contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, California 95834 or by telephone at (800) 952-5210 or (916) 445-1254.

29. MISCELLANEOUS
These Legal Terms and any policies or operating rules posted by us on the Services or in respect to the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision. These Legal Terms operate to the fullest extent permissible by law. We may assign any or all of our rights and obligations to others at any time. We shall not be responsible or liable for any loss, damage, delay, or failure to act caused by any cause beyond our reasonable control. If any provision or part of a provision of these Legal Terms is determined to be unlawful, void, or unenforceable, that provision or part of the provision is deemed severable from these Legal Terms and does not affect the validity and enforceability of any remaining provisions. There is no joint venture, partnership, employment or agency relationship created between you and us as a result of these Legal Terms or use of the Services. You agree that these Legal Terms will not be construed against us by virtue of having drafted them. You hereby waive any and all defenses you may have based on the electronic form of these Legal Terms and the lack of signing by the parties hereto to execute these Legal Terms.

30. MEDICAL DISCLAIMER
Important: This app provides estimates and suggestions, not medical advice. For health concerns, please consult a healthcare professional. If you have diabetes, heart disease, kidney disease, food allergies, are pregnant/nursing, take medications, or have any other health conditions, consult your doctor before following any meal plan or nutrition recommendations. Calorie calculations are based on the Mifflin-St Jeor equation and are estimates only. Individual needs may vary based on metabolism, medical conditions, and other factors.

31. AI PHOTO RECOGNITION ACCURACY
Our AI-powered food recognition feature (Premium) uses machine learning to identify foods from photos. This technology is not 100% accurate and may: - Misidentify foods or ingredients - Provide incorrect nutritional information - Fail to recognize certain foods Users should verify AI-generated nutrition data and manually correct any inaccuracies. Veetha is not responsible for incorrect data resulting from AI recognition errors.

32. USER-GENERATED CONTENT AND PHOTO USAGE
By uploading photos to Veetha, you grant us a non-exclusive, worldwide license to use, store, and process your images for the purpose of: - Providing AI food recognition features - Improving our machine learning models and services - Displaying images in your account You retain all ownership rights to your content. We will not use your photos for marketing purposes without your explicit consent. You may delete your photos at any time through the app.

33. FREE AND PREMIUM FEATURES
Veetha offers both free and premium features: FREE FEATURES (No subscription required): - Barcode scanning for packaged foods - Manual meal logging - Basic nutrition tracking - Access to all app screens and stats PREMIUM FEATURES ($3.99/month): - AI-powered photo food recognition - [Future features as you add them] Premium subscriptions are billed monthly through Google Play Store or Apple App Store. You can cancel anytime through your app store settings. No refunds for partial months unless required by applicable law or app store policy.

34. CONTACT US
In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:

Enzo Gazzolo
veetha.app@gmail.com

`}
            </Text>
          </>
        ) : (
          /* PRIVACY POLICY */
          <>
            <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
            <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
              Last Updated: December 22, 2024
            </Text>
            <View style={styles.divider} />
            <Text style={[styles.bodyText, { color: theme.text }]}>
{`PRIVACY POLICY
Last updated December 23, 2025



These Terms of Service are provided in English only. 
By using this app, you agree to these terms in English.

Estos Términos de Servicio se proporcionan solo en inglés.
Ces Conditions d'Utilisation sont fournies en anglais uniquement.
Ang mga Tuntunin ng Serbisyo ay ibinibigay sa Ingles lamang.

This Privacy Notice for Enzo Gazzolo (doing business as Veetha) ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:
	Download and use our mobile application (Veetha), or any other application of ours that links to this Privacy Notice
	Use Veetha. Veetha is a mobile nutrition tracking application that helps users monitor their daily food intake, track calories and macronutrients, and achieve their health and fitness goals. The app provides two main ways to log meals: 1. Barcode Scanning (Free): Users can scan product barcodes to quickly log packaged foods and retrieve nutritional information from our database. 2. AI Photo Recognition (Premium - $3.99/month): Users can take photos of their meals, and our artificial intelligence technology identifies the food items and estimates their nutritional content. Additional features include: - Personalized daily calorie and macro goals based on user profile (age, gender, height, weight, activity level, and health objectives) - Comprehensive nutrition tracking with detailed breakdowns of proteins, carbohydrates, fats, and micronutrients - Progress tracking with daily, weekly, and monthly statistics and charts - Streak tracking to maintain consistent logging habits - Dietary preference and restriction management (vegetarian, vegan, keto, allergies, etc.) - Multi-language support (English, Spanish, French, Filipino) - Meal history and logging features Veetha uses the Mifflin-St Jeor equation to calculate personalized calorie recommendations. The app is designed to provide nutritional estimates and tracking tools, not medical advice. Users with medical conditions, dietary restrictions, or health concerns should consult healthcare professionals before making dietary changes. The app is available on Android devices through the Google Play Store, with iOS support planned for future release.
	Engage with us in other related ways, including any marketing or events
Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at veetha.app@gmail.com.


SUMMARY OF KEY POINTS
This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.

What personal information do we process? When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.

Do we process any sensitive personal information? Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.

Do we collect any information from third parties? We do not collect any information from third parties.

How do we process your information? We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.

In what situations and with which parties do we share personal information? We may share information in specific situations and with specific third parties. Learn more about when and with whom we share your personal information.

How do we keep your information safe? We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about how we keep your information safe.

What are your rights? Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.

How do you exercise your rights? The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.

Want to learn more about what we do with any information we collect? Review the Privacy Notice in full.


TABLE OF CONTENTS
1. WHAT INFORMATION DO WE COLLECT?
2. HOW DO WE PROCESS YOUR INFORMATION?
3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?
4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?
8. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?
9. HOW LONG DO WE KEEP YOUR INFORMATION?
10. HOW DO WE KEEP YOUR INFORMATION SAFE?
11. DO WE COLLECT INFORMATION FROM MINORS?
12. WHAT ARE YOUR PRIVACY RIGHTS?
13. CONTROLS FOR DO-NOT-TRACK FEATURES
14. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
15. DO WE MAKE UPDATES TO THIS NOTICE?
16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?


1. WHAT INFORMATION DO WE COLLECT?
Personal information you disclose to us
In Short: We collect personal information that you provide to us.

We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.

Personal Information Provided by You. The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:
	names
	email addresses
	passwords
Sensitive Information. We do not process sensitive information.

Payment Data. We may collect data necessary to process your payment if you choose to make purchases, such as your payment instrument number, and the security code associated with your payment instrument. All payment data is handled and stored by Google Play Store / Google Payments, Apple App Store / Apple Pay and RevenueCat. You may find their privacy notice link(s) here: https://payments.google.com/payments/apis-secure/u/0/get_legal_document?ldo=0&ldt=privacynotice, https://www.apple.com/legal/privacy/ and https://www.revenuecat.com/privacy.

Veetha does not directly collect, store, or process any payment card information. All subscription payments are processed securely through: - Google Play Store (for Android users) - Handles payment processing, subscription billing, and refunds according to Google Play's terms - Apple App Store (for iOS users) - Handles payment processing, subscription billing, and refunds according to Apple's terms - RevenueCat - Manages subscription verification and status tracking but does not process actual payments Users' payment information (credit cards, debit cards, billing addresses) is collected and stored only by Google and Apple. Veetha only receives confirmation of successful purchases and subscription status (active/expired) to enable premium features. For payment disputes, refunds, or billing questions, users must contact Google Play Store or Apple App Store directly through their respective support channels.

Social Media Login Data. We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in the section called "HOW DO WE HANDLE YOUR SOCIAL LOGINS?" below.

Application Data. If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:
	Mobile Device Access. We may request access or permission to certain features from your mobile device, including your mobile device's camera, photo library/gallery, and other features. If you wish to change our access or permissions, you may do so in your device's settings.
	Mobile Device Data. We automatically collect device information (such as your mobile device ID, model, and manufacturer), operating system, version information and system configuration information, device and application identification numbers, browser type and version, hardware model Internet service provider and/or mobile carrier, and Internet Protocol (IP) address (or proxy server). If you are using our application(s), we may also collect information about the phone network associated with your mobile device, your mobile device’s operating system or platform, the type of mobile device you use, your mobile device’s unique device ID, and information about the features of our application(s) you accessed.
This information is primarily needed to maintain the security and operation of our application(s), for troubleshooting, and for our internal analytics and reporting purposes.

All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
Information automatically collected
In Short: Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.

We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.

The information we collect includes:
	Log and Usage Data. Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files. Depending on how you interact with us, this log data may include your IP address, device information, browser type, and settings and information about your activity in the Services (such as the date/time stamps associated with your usage, pages and files viewed, searches, and other actions you take such as which features you use), device event information (such as system activity, error reports (sometimes called "crash dumps"), and hardware settings).
	Device Data. We collect device data such as information about your computer, phone, tablet, or other device you use to access the Services. Depending on the device used, this device data may include information such as your IP address (or proxy server), device and application identification numbers, location, browser type, hardware model, Internet service provider and/or mobile carrier, operating system, and system configuration information.
Google API
Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.


2. HOW DO WE PROCESS YOUR INFORMATION?
In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We process the personal information for the following purposes listed below. We may also process your information for other purposes only with your prior explicit consent.

We process your personal information for a variety of reasons, depending on how you interact with our Services, including:
	To facilitate account creation and authentication and otherwise manage user accounts. We may process your information so you can create and log in to your account, as well as keep your account in working order.
	To deliver and facilitate delivery of services to the user. We may process your information to provide you with the requested service.
	To respond to user inquiries/offer support to users. We may process your information to respond to your inquiries and solve any potential issues you might have with the requested service.
	To send administrative information to you. We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.
	To protect our Services. We may process your information as part of our efforts to keep our Services safe and secure, including fraud monitoring and prevention.
	To identify usage trends. We may process information about how you use our Services to better understand how they are being used so we can improve them.
	To save or protect an individual's vital interest. We may process your information when necessary to save or protect an individual’s vital interest, such as to prevent harm.
	To calculate personalized nutrition goals. We use personal information including age, gender, height, weight, activity level, and health objectives to calculate personalized daily calorie and macronutrient goals using the Mifflin-St Jeor equation. This is the core feature of our nutrition tracking service.
	To provide AI-powered food recognition. For premium subscribers, we use uploaded food photos along with user's dietary preferences to provide AI-powered food identification and nutrition estimation. Photos are processed to identify food items and calculate nutritional content.
	To manage dietary restrictions and allergies. We use information about user allergies, diet types (vegetarian, vegan, keto, etc.), and dietary preferences to filter meal recommendations and ensure recipe suggestions are safe and appropriate for each user.
	To track progress and maintain streak data. We use meal logging history and timestamps to calculate streak days, generate progress statistics, and display weekly and monthly nutrition charts. This helps users monitor their consistency and achievement of health goals.
	To improve AI food recognition accuracy. We analyze food photos uploaded by users (in aggregate and anonymized form) to train and improve our machine learning models for food identification. This helps us provide more accurate nutrition estimates for all users. Individual photos are not shared or used for marketing purposes.
	To analyze app performance and fix technical issues. We use Firebase Analytics and crash reporting to monitor app performance, identify bugs, diagnose technical problems, and understand which devices or operating systems experience issues. This data is used only to maintain and improve app stability.

3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?
In Short: We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.

If you are located in the EU or UK, this section applies to you.

The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:
	Consent. We may process your information if you have given us permission (i.e., consent) to use your personal information for a specific purpose. You can withdraw your consent at any time. Learn more about withdrawing your consent.
	Performance of a Contract. We may process your personal information when we believe it is necessary to fulfill our contractual obligations to you, including providing our Services or at your request prior to entering into a contract with you.
	Legitimate Interests. We may process your information when we believe it is reasonably necessary to achieve our legitimate business interests and those interests do not outweigh your interests and fundamental rights and freedoms. For example, we may process your personal information for some of the purposes described in order to:
	Analyze how our Services are used so we can improve them to engage and retain users
	Diagnose problems and/or prevent fraudulent activities
	In order to continuously improve the accuracy and reliability of our AI-powered food recognition feature, ensuring users receive better nutrition estimates over time.
	In order to ensure the app functions properly for all users across different devices and operating systems, and to quickly identify and resolve technical problems that affect user experience.
	Legal Obligations. We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.

	Vital Interests. We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.

If you are located in Canada, this section applies to you.

We may process your information if you have given us specific permission (i.e., express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e., implied consent). You can withdraw your consent at any time.

In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including, for example:
	If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way
	For investigations and fraud detection and prevention
	For business transactions provided certain conditions are met
	If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim
	For identifying injured, ill, or deceased persons and communicating with next of kin
	If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse
	If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province
	If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records
	If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced
	If the collection is solely for journalistic, artistic, or literary purposes
	If the information is publicly available and is specified by the regulations
	We may disclose de-identified information for approved research or statistics projects, subject to ethics oversight and confidentiality commitments

4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
In Short: We may share information in specific situations described in this section and/or with the following third parties.

Vendors, Consultants, and Other Third-Party Service Providers. We may share your data with third-party vendors, service providers, contractors, or agents ("third parties") who perform services for us or on our behalf and require access to such information to do that work. We have contracts in place with our third parties, which are designed to help safeguard your personal information. This means that they cannot do anything with your personal information unless we have instructed them to do it. They will also not share your personal information with any organization apart from us. They also commit to protect the data they hold on our behalf and to retain it for the period we instruct.

The third parties we may share personal information with are as follows:
	Allow Users to Connect to Their Third-Party Accounts
Facebook account and Google account
	Cloud Computing Services
Google Cloud Platform
	Functionality and Infrastructure Optimization
Firebase Hosting and Cloud Firestore
	Invoice and Billing
Apple Pay and Google Wallet
	User Account Registration and Authentication
Facebook Login and Google Sign-In
	Web and Mobile Analytics
Google Analytics for Firebase
	Website Performance Monitoring
Firebase Crash Reporting
	Website Testing
Google Play Console and TestFlight
	Subscription Management
RevenueCat - Manages premium subscriptions and in-app purchase processing
	Database and Backend Services
Supabase - Cloud database hosting, user authentication, and data storage (US East - Ohio region)
	Recipe and Meal Recommendations API
Spoonacular - Provides recipe data and meal recommendations based on user dietary preferences (future feature)
	AI-Powered Food Recognition
Machine learning model for identifying food items from photos and estimating nutritional content (Premium feature)

We also may need to share your personal information in the following situations:
	Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.

5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
In Short: We may use cookies and other tracking technologies to collect and store your information.

We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.

We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, to tailor advertisements to your interests, or to send abandoned shopping cart reminders (depending on your communication preferences). The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear either on our Services or on other websites.

To the extent these online tracking technologies are deemed to be a "sale"/"sharing" (which includes targeted advertising, as defined under the applicable laws) under applicable US state laws, you can opt out of these online tracking technologies by submitting a request as described below under section "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"

Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
Google Analytics
We may share your information with Google Analytics to track and analyze the use of the Services. To opt out of being tracked by Google Analytics across the Services, visit https://tools.google.com/dlpage/gaoptout. For more information on the privacy practices of Google, please visit the Google Privacy & Terms page.

6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
In Short: We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies.

As part of our Services, we offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies (collectively, "AI Products"). These tools are designed to enhance your experience and provide you with innovative solutions. The terms in this Privacy Notice govern your use of the AI Products within our Services.

Use of AI Technologies

We provide the AI Products through third-party service providers ("AI Service Providers"), including Clarifai. As outlined in this Privacy Notice, your input, output, and personal information will be shared with and processed by these AI Service Providers to enable your use of our AI Products for purposes outlined in "WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?" You must not use the AI Products in any way that violates the terms or policies of any AI Service Provider.

Our AI Products

Our AI Products are designed for the following functions:
	Image analysis

How We Process Your Data Using AI

All personal information processed using our AI Products is handled in line with our Privacy Notice and our agreement with third parties. This ensures high security and safeguards your personal information throughout the process, giving you peace of mind about your data's safety.

How to Opt Out

We believe in giving you the power to decide how your data is used. To opt out, you can:
	Contact us using the contact information provided
	Log in to your account settings and update your user account
	Log in to your account settings and update your user account
	Contact us using the contact information provided
	Veetha offers AI-powered photo food recognition in both free and premium tiers: FREE USERS: Limited to 5 photo scans per day. Users can opt out by using the barcode scanning feature instead of taking photos. PREMIUM USERS ($3.99/month or $39.99/year): Increased limit of 50 photo scans per day. Users can opt out by canceling their premium subscription through their app store settings (Google Play Store or Apple App Store), or by using barcode scanning instead. Photos uploaded by users are analyzed by Clarifai's food recognition API and may be used in aggregate (anonymized) form to train and improve our custom food recognition database. Users can delete their photos at any time through the app.

7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?
In Short: If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.

Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such a social media platform.

We will use the information we receive only for the purposes that are described in this Privacy Notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps.

8. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?
In Short: We may transfer, store, and process your information in countries other than your own.

Our servers are located in the United States. Regardless of your location, please be aware that your information may be transferred to, stored by, and processed by us in our facilities and in the facilities of the third parties with whom we may share your personal information (see "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?" above), including facilities in the United States, and other countries.

If you are a resident in the European Economic Area (EEA), United Kingdom (UK), or Switzerland, then these countries may not necessarily have data protection laws or other similar laws as comprehensive as those in your country. However, we will take all necessary measures to protect your personal information in accordance with this Privacy Notice and applicable law.

European Commission's Standard Contractual Clauses:

We have implemented measures to protect your personal information, including by using the European Commission's Standard Contractual Clauses for transfers of personal information between our group companies and between us and our third-party providers. These clauses require all recipients to protect all personal information that they process originating from the EEA or UK in accordance with European data protection laws and regulations. Our Standard Contractual Clauses can be provided upon request. We have implemented similar appropriate safeguards with our third-party service providers and partners and further details can be provided upon request.

9. HOW LONG DO WE KEEP YOUR INFORMATION?
In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.

We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.

When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.

10. HOW DO WE KEEP YOUR INFORMATION SAFE?
In Short: We aim to protect your personal information through a system of organizational and technical security measures.

We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.

11. DO WE COLLECT INFORMATION FROM MINORS?
In Short: We do not knowingly collect data from or market to children under 18 years of age or the equivalent age as specified by law in your jurisdiction.

We do not knowingly collect, solicit data from, or market to children under 18 years of age or the equivalent age as specified by law in your jurisdiction, nor do we knowingly sell such personal information. By using the Services, you represent that you are at least 18 or the equivalent age as specified by law in your jurisdiction or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of age or the equivalent age as specified by law in your jurisdiction has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18 or the equivalent age as specified by law in your jurisdiction, please contact us at veetha.app@gmail.com.

12. WHAT ARE YOUR PRIVACY RIGHTS?
In Short: Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.

In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making. If a decision that produces legal or similarly significant effects is made solely by automated means, we will inform you, explain the main factors, and offer a simple way to request human review. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.

We will consider and act upon any request in accordance with applicable data protection laws.
 
If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your Member State data protection authority or UK data protection authority.

If you are located in Switzerland, you may contact the Federal Data Protection and Information Commissioner.

Withdrawing your consent: If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.

However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.
Account Information
If you would at any time like to review or change the information in your account or terminate your account, you can:
	Log in to your account settings and update your user account.
	Contact us using the contact information provided.
	To update your account: Open the Veetha app, navigate to the Profile screen, and tap "Edit Profile" to modify your personal information, goals, or dietary preferences.
	To delete your account: Open the Veetha app, go to the Profile screen, scroll to the "Legal" section, and tap "Delete Account." This will permanently remove all your data including meal logs, photos, and profile information within 30 days.
Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.

If you have questions or comments about your privacy rights, you may email us at veetha.app@gmail.com.

13. CONTROLS FOR DO-NOT-TRACK FEATURES
Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.

California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.

14. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
In Short: If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. More information is provided below.
Categories of Personal Information We Collect
The table below shows the categories of personal information we have collected in the past twelve (12) months. The table includes illustrative examples of each category and does not reflect the personal information we collect from you. For a comprehensive inventory of all personal information we process, please refer to the section "WHAT INFORMATION DO WE COLLECT?"

Category	Examples	Collected
A. Identifiers	Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name	
YES

B. Personal information as defined in the California Customer Records statute	Name, contact information, education, employment, employment history, and financial information	
YES

C. Protected classification characteristics under state or federal law	Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data	
YES

D. Commercial information	Transaction information, purchase history, financial details, and payment information	
YES

E. Biometric information	Fingerprints and voiceprints	
NO

F. Internet or other similar network activity	Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements	
YES

G. Geolocation data	Device location	
NO

H. Audio, electronic, sensory, or similar information	Images and audio, video or call recordings created in connection with our business activities	
YES

I. Professional or employment-related information	Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us	
NO

J. Education Information	Student records and directory information	
NO

K. Inferences drawn from collected personal information	Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics	
YES

L. Sensitive personal Information		
NO


We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:
	Receiving help through our customer support channels;
	Participation in customer surveys or contests; and
	Facilitation in the delivery of our Services and to respond to your inquiries.
We will use and retain the collected personal information as needed to provide the Services or for:
	Category A - As long as the user has an account with us
	Category B - As long as the user has an account with us
	Category C - As long as the user has an account with us
	Category D - As long as the user has an account with us
	Category F - As long as the user has an account with us
	Category H - As long as the user has an account with us
	Category K - As long as the user has an account with us
Sources of Personal Information
Learn more about the sources of personal information we collect in "WHAT INFORMATION DO WE COLLECT?"
How We Use and Share Personal Information
Learn more about how we use your personal information in the section, "HOW DO WE PROCESS YOUR INFORMATION?"

Will your information be shared with anyone else?

We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Learn more about how we disclose personal information to in the section, "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"

We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.

We have not sold or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We have disclosed the following categories of personal information to third parties for a business or commercial purpose in the preceding twelve (12) months:
	Category A. Identifiers
	Category B. Personal information as defined in the California Customer Records law
	Category C. Characteristics of protected classifications under state or federal law
	Category D. Commercial information
	Category F. Internet or other electronic network activity information
	Category H. Audio, electronic, visual, and similar information
	Category K. Inferences drawn from collected personal information
The categories of third parties to whom we disclosed personal information for a business or commercial purpose can be found under "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"
Your Rights
You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:
	Right to know whether or not we are processing your personal data
	Right to access your personal data
	Right to correct inaccuracies in your personal data
	Right to request the deletion of your personal data
	Right to obtain a copy of the personal data you previously shared with us
	Right to non-discrimination for exercising your rights
	Right to opt out of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California’s privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")
Depending upon the state where you live, you may also have the following rights:
	Right to access the categories of personal data being processed (as permitted by applicable law, including the privacy law in Minnesota)
	Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in California, Delaware, and Maryland)
	Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in Minnesota and Oregon)
	Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable law, including the privacy law in Connecticut)
	Right to review, understand, question, and depending on where you live, correct how personal data has been profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota)
	Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including the privacy law in California)
	Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including the privacy law in Florida)
How to Exercise Your Rights
To exercise these rights, you can contact us by submitting a data subject access request, by emailing us at veetha.app@gmail.com, or by referring to the contact details at the bottom of this document.

Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.

Request Verification
Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.

If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request and the agent will need to provide a written and signed permission from you to submit such request on your behalf.
Appeals
Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at veetha.app@gmail.com. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney general.
California "Shine The Light" Law
California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?"

15. DO WE MAKE UPDATES TO THIS NOTICE?
In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.

We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.

16. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
If you have questions or comments about this notice, you may email us at veetha.app@gmail.com.

17. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please fill out and submit a data subject access request.

`}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 24,
  },
});