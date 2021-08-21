const Routing = require('dependencies/utils/Routing');

const routing = new Routing();

routing.post('/register', require('./guest/register'));
routing.post(
  '/forgot-password-send',
  require('./guest/forgotPasswordSend')
);
routing.post(
  '/forgot-password-confirm',
  require('./guest/forgotPasswordConfirm')
);
routing.post('/login', require('./guest/login'));
routing.post('/re-auth', require('./guest/reAuth'));
routing.post('/verify-email', require('./auth/verifyEmail'));
routing.post(
  '/resend-email-code',
  require('./auth/resendEmailCode')
);
routing.post(
  '/change-personal-info',
  require('./auth/changePersonalInfo')
);
routing.post(
  '/change-profile-picture',
  require('./auth/changeProfilePicture')
);
routing.post(
  '/add-to-contacts/:contactId',
  require('./auth/addToContact')
);
routing.post(
  '/accept-contact-request/:senderId',
  require('./auth/acceptContactRequest')
);
routing.post(
  '/decline-contact-request/:senderId',
  require('./auth/declineContactRequest')
);
routing.post('/validate-auth', require('./auth/validateAuth'));
routing.post('/setup-complete', require('./auth/setupComplete'));
routing.post(
  '/send-follow-up/:contactId',
  require('./auth/sendFollowUp')
);
routing.post(
  '/cancel-contact-request/:contactId',
  require('./auth/cancelContactRequest')
);
routing.post('/disconnect/:contactId', require('./auth/disconnect'));
routing.post('/block-user/:contactId', require('./auth/blockUser'));
routing.post(
  '/unblock-user/:contactId',
  require('./auth/unblockUser')
);
routing.post('/change-password', require('./auth/changePassword'));
routing.post('/logout', require('./auth/logout'));
routing.post('/contact-details', require('./auth/contactDetailAdd'));
routing.post(
  '/mark-as-close-friend/:contactId',
  require('./auth/markAsCloseFriend')
);
routing.post(
  '/unmark-as-close-friend/:contactId',
  require('./auth/unmarkAsCloseFriend')
);
routing.post(
  '/change-allow-search-by-name',
  require('./auth/changeAllowSearchByName')
);
routing.post(
  '/change-allow-search-by-username',
  require('./auth/changeAllowSearchByUsername')
);
routing.post('/change-username', require('./auth/changeUsername'));
routing.post(
  '/send-chat-message/:contactId',
  require('./auth/sendChatMessage')
);
routing.post(
  '/chat-message-seen/:chatMessageId',
  require('./auth/chatMessageSeen')
);
routing.post(
  '/chat-typing-status/:contactId',
  require('./auth/chatTypingStatus')
);
routing.post('/event', require('./auth/createEvent'));
routing.post(
  '/change-event-cover-picture/:eventId',
  require('./auth/changeEventCoverPicture')
);
routing.post(
  '/event/publish/:eventId',
  require('./auth/publishEvent')
);
routing.post(
  '/events/organizers/add/:eventId',
  require('./auth/addEventOrganizer')
);
routing.post(
  '/events/invite-user/:eventId',
  require('./auth/inviteUserToEvent')
);
routing.post(
  '/events/accept-invitation/:eventId',
  require('./auth/acceptEventInvitation')
);
routing.post(
  '/events/reject-invitation/:eventId',
  require('./auth/rejectEventInvitation')
);
routing.post('/events/join/:eventId', require('./auth/joinEvent'));
routing.post(
  '/event/comment/:eventId',
  require('./auth/eventPostComment')
);
routing.post(
  '/event/reply-to-comment/:commentId',
  require('./auth/eventCommentReply')
);

routing.delete(
  '/contact-details/:contactDetailId',
  require('./auth/contactDetailDelete')
);
routing.delete(
  '/events/organizers/:eventId/:organizerId',
  require('./auth/removeEventOrganizer')
);
routing.delete(
  '/events/cancel-going/:eventId',
  require('./auth/cancelGoing')
);
routing.delete(
  '/events/cancel-invitation/:eventId',
  require('./auth/cancelEventInvitation')
);
routing.delete(
  '/event/comment/:commentId',
  require('./auth/deleteEventComment')
);

routing.patch(
  '/contact-details/:contactDetailId',
  require('./auth/contactDetailUpdate')
);
routing.patch('/event/:eventId', require('./auth/editEvent'));
routing.patch(
  '/event/comment/:commentId',
  require('./auth/eventEditComment')
);

routing.get(
  '/received-contact-requests',
  require('./auth/receivedContactRequests')
);
routing.get(
  '/sent-contact-requests',
  require('./auth/sentContactRequests')
);
routing.get('/notifications', require('./auth/notifications'));
routing.get(
  '/contacts/:contactId',
  require('./auth/contactProfile')
);
routing.get('/block-list', require('./auth/blockList'));
routing.get(
  '/contact-details',
  require('./auth/contactDetailsList')
);
routing.get('/search-users', require('./auth/searchUsers'));
routing.get(
  '/chat-messages/:contactId',
  require('./auth/chatMessages')
);
routing.get('/my-inbox', require('./auth/myInbox'));
routing.get('/search-contacts', require('./auth/searchContacts'));
routing.get('/my-events', require('./auth/myEvents'));
routing.get(
  '/event/organizers/:eventId',
  require('./auth/eventOrganizers')
);
routing.get(
  '/events/invite-contacts/:eventId',
  require('./auth/inviteContacts')
);
routing.get(
  '/events/add-organizer/:eventId',
  require('./auth/addContactsToOrganizers')
);
routing.get(
  'received-event-invitations',
  require('./auth/receivedEventInvitations')
);
routing.get(
  'sent-event-invitations',
  require('./auth/sentEventInvitations')
);
routing.get(
  '/event/comments/:eventId',
  require('./auth/eventComments')
);
routing.get(
  '/event/comment/edit-history/:commentId',
  require('./auth/eventCommentEditHistory')
);

module.exports = routing;
