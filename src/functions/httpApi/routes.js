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
  '/add-to-contacts/{contactId}',
  require('./auth/addToContact')
);
routing.post(
  '/accept-contact-request/{senderId}',
  require('./auth/acceptContactRequest')
);
routing.post(
  '/decline-contact-request/{senderId}',
  require('./auth/declineContactRequest')
);
routing.post('/validate-auth', require('./auth/validateAuth'));
routing.post('/setup-complete', require('./auth/setupComplete'));
routing.post(
  '/send-follow-up/{contactId}',
  require('./auth/sendFollowUp')
);
routing.post(
  '/cancel-contact-request/{contactId}',
  require('./auth/cancelContactRequest')
);
routing.post(
  '/disconnect/{contactId}',
  require('./auth/disconnect')
);
routing.post('/block-user/{contactId}', require('./auth/blockUser'));
routing.post(
  '/unblock-user/{contactId}',
  require('./auth/unblockUser')
);
routing.post('/change-password', require('./auth/changePassword'));
routing.post('/logout', require('./auth/logout'));
routing.post('/contact-details', require('./auth/contactDetailAdd'));
routing.post(
  '/mark-as-close-friend/{contactId}',
  require('./auth/markAsCloseFriend')
);
routing.post(
  '/unmark-as-close-friend/{contactId}',
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
  '/send-chat-message/{contactId}',
  require('./auth/sendChatMessage')
);
routing.post(
  '/chat-message-seen/{chatMessageId}',
  require('./auth/chatMessageSeen')
);
routing.post(
  '/chat-typing-status/{contactId}',
  require('./auth/chatTypingStatus')
);

routing.delete(
  '/contact-details/{contactDetailId}',
  require('./auth/contactDetailDelete')
);

routing.patch(
  '/contact-details/{contactDetailId}',
  require('./auth/contactDetailUpdate')
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
routing.get('/my-contacts', require('./auth/myContacts'));
routing.get(
  '/contacts/{contactId}',
  require('./auth/contactProfile')
);
routing.get('/block-list', require('./auth/blockList'));
routing.get(
  '/contact-details',
  require('./auth/contactDetailsList')
);
routing.get('/search-users', require('./auth/searchUsers'));
routing.get(
  '/chat-messages/{contactId}',
  require('./auth/chatMessages')
);

module.exports = routing;