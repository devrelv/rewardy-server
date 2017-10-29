// TODO: move this to locale
const BACK_TO_MENU_ACTION = 'What\'s next?';
const BACK_TO_MENU_TITLE = 'Get back to menu';

function sendBackToMainMenu(session, builder) {
    var cardActions = [builder.CardAction.imBack(session, BACK_TO_MENU_TITLE, BACK_TO_MENU_TITLE)];

    var card = new builder.HeroCard()
        .title(BACK_TO_MENU_ACTION)
        .buttons(cardActions);

    session.endDialog(new builder.Message(session)
        .addAttachment(card));
}

module.exports = {
    sendBackToMainMenu: sendBackToMainMenu
}