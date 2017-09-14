**Flow:**

**On Subscription:**
Hello and welcome to Vale! Earn credits with awesome apps and games you play each time. 🎁 Redeem Amazon, iTunes, Google Play and Xbox gift cards. 

**Showing keyboard options:**
Hey! please select on of the following options

**General Keyboard options:**
1. Check your credit
2. Get free credit! 🙌
3. Invite friends for credits
4. Redeem

**Check credit:**
[On click option 1] Calculating your credits...
[On click option 2] Let me figure this out...

Response: According to our records, at this moment you have {{points}}! You can do much more.

**Redeem:**
[Display]: Carousel of options

[On click on each item]:
One second...We are checking your points status.

If the user has enough credit:
At this moment you have {{points}}. Would you like to spend {{spend}} on this ({{keyboardPositive}}/{{keyboardNegative}})??

Show **YES/NO Keyboard**.
If "Yes":
You got it. Voucher code for \"{{option}}\" is \"{{voucher}}\". Enjoy!

If "No":
Sure thing! Save your points for something bigger.

If the user has less credits:
Sorry! At this moment you have {{points}}. You miss {{miss}} for this item. Try to invite your friends.

**Invite friends for credit**
**Invite friends Keyboard options:**
Your referral code is {{referral}}. You will earn {{points}} for each referral!
1. Enter other's referral code
2. Get your referral message

**[On click referral input]**
Please enter the referral code you got.

[On enter]
One second...We are checking that referral code.

If failed while checking referral code:
That is weird! We could not validate this referral. Please try again later.

If invalid referral code:
Oh no. It seems that you got an invalid referral code ({{referral}}). Please contact your friend.

If outdated referral code:
It seems that this referral code has expired. Invite more friends for more points!

If user entered its own referral code:
Nice try! Invite more friends for more points!

If valid:
Amazing. You just earned {{points}}.

**[On click your referral message]**
Intro:
Feel free to share this message wherever your friends at 👇

Content:
Join \"Vale\" App referral on Viber. Earn credits with awesome apps and games you play each time. Redeem Amazon, iTunes, Google Play and Xbox gift cards. Get {{points}} free by entering my referral code {{referral}}.

**Get free credit - will follow up with a link to external broswer:**
Please check out our offer wall 👇


**Check daily bonus keyboard button - will appear when clicking on get free credit:**
Get your daily bonus 🤞

**Daily bonus:**
If should get points:
We just gifted you with {{points}}. Get more points by just coming back every day! 

If already tried today - time less than a minute:
It seems we already gifted you today. Come back in {{nextTimeSeconds}} seconds.

If already tried today - time less than a hour:
It seems we already gifted you today. Come back in {{nextTimeMinutes}} minutes.

If already tried today - time less than a day:
It seems we already gifted you today. Come back in {{nextTimeHours}} hours.

**Abort:**
Return to Main Menu

**Vale Points:**
Will be concat to every points. For example 100 Vale Points (like USD):
Vale Points

**General Error - Could not figure out the user id:**
That is weird! We could not find your user details. Please leave the bot and try again.

**General Error - Could not figure out what the user wants (For example, sending a picture instead of answering):**
Darn. Could not understand this. Try to use the keyboards.


