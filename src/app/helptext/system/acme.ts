import { Validators } from '@angular/forms';
import { T } from '../../translate-marker';

export const helptext_system_acme = {
  edit_title: T('Edit DNS Authenticator'),
  add_title: T('Add DNS Authenticator'),
  select_auth_label: T('Select Authenticator'),

  authenticator_name_name: 'name',
  authenticator_name_placeholder: T('Name'),
  authenticator_name_tooltip: T('Internal identifier for the\
 authenticator.'),
  authenticator_name_validation: Validators.required,

  authenticator_provider_name: 'authenticator',
  authenticator_provider_placeholder: T('Authenticator'),
  authenticator_provider_tooltip: T('Choose a DNS provider and\
 configure any required authenticator attributes.'),

  auth_attributes_label: T('Authenticator Attributes'),

  auth_credentials_1_name: 'access_key_id-route53',
  auth_credentials_1_placeholder: T('Access ID Key'),
  auth_credentials_1_tooltip: T('Key generated by the Amazon Web\
 Services account. See the\
 <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"\
 target="_blank">AWS Access Key documentation</a> for instructions to\
 generate the key.'),
  auth_credentials_1_validation: Validators.required,

  auth_credentials_2_name: 'secret_access_key-route53',
  auth_credentials_2_placeholder: T('Secret Access Key'),
  auth_credentials_2_tooltip: T('Key generated by the Amazon Web\
 Services account. See the\
 <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"\
 target="_blank">AWS Access Key documentation</a> for instructions to\
 generate the key.'),
  auth_credentials_2_validation: Validators.required,
};
