from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class UploadRateThrottle(UserRateThrottle):
    scope = 'upload'
