# Django Secret Key
# This random password is used by SSM Parameter Store (see ssm.tf)
resource "random_password" "django_secret" {
  length  = 50
  special = true
}
