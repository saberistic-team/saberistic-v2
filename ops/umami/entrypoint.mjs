import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'

const databaseRole = 'saberistic_umami'
const administratorId = '41e2b680-648e-4b09-bcd7-3e2b10c06264'
const administratorUsername = 'saberistic_admin'
const nextjsUserId = 1001
const nextjsGroupId = 65533
const roleConnectionLimit = 10
const schema = process.env.UMAMI_DATABASE_SCHEMA ?? 'umami'
const command = process.argv[2]
const args = process.argv.slice(3)

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const quoteIdentifier = (identifier) => `"${identifier.replaceAll('"', '""')}"`

if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
  fail('UMAMI_DATABASE_SCHEMA must be a safe PostgreSQL identifier.')
}

if (!command) {
  fail('The upstream Umami container command is missing.')
}

if (typeof process.getuid !== 'function' || process.getuid() !== 0) {
  fail('The Umami database bootstrap supervisor must start as root.')
}

const databasePassword = process.env.UMAMI_DATABASE_PASSWORD
const administratorPassword = process.env.UMAMI_ADMIN_PASSWORD
const twoFactorSeed = process.env.UMAMI_TWO_FACTOR_SEED

if (!databasePassword || Buffer.byteLength(databasePassword, 'utf8') < 32) {
  fail('UMAMI_DATABASE_PASSWORD must be a stable secret of at least 32 bytes.')
}

const administratorPasswordBytes = Buffer.byteLength(administratorPassword ?? '', 'utf8')

if (administratorPasswordBytes < 32 || administratorPasswordBytes > 72) {
  fail('UMAMI_ADMIN_PASSWORD must be a stable secret between 32 and 72 UTF-8 bytes.')
}

if (!twoFactorSeed || Buffer.byteLength(twoFactorSeed, 'utf8') < 32) {
  fail('UMAMI_TWO_FACTOR_SEED must be a stable secret of at least 32 bytes.')
}

const twoFactorEncryptionKey = createHash('sha256')
  .update('saberistic-umami-two-factor-v1\0', 'utf8')
  .update(twoFactorSeed, 'utf8')
  .digest('hex')

let adminDatabaseURL

try {
  adminDatabaseURL = new URL(process.env.UMAMI_DATABASE_ADMIN_URL)
} catch {
  fail('UMAMI_DATABASE_ADMIN_URL must be a valid PostgreSQL connection URL.')
}

if (!['postgres:', 'postgresql:'].includes(adminDatabaseURL.protocol)) {
  fail('UMAMI_DATABASE_ADMIN_URL must use PostgreSQL.')
}

if (!adminDatabaseURL.hostname || !adminDatabaseURL.pathname.slice(1)) {
  fail('UMAMI_DATABASE_ADMIN_URL must include a database host and name.')
}

const runtimeDatabaseURL = new URL(adminDatabaseURL)
runtimeDatabaseURL.username = databaseRole
runtimeDatabaseURL.password = databasePassword
runtimeDatabaseURL.searchParams.set('schema', schema)

const bootstrapDatabaseURL = new URL(adminDatabaseURL)
bootstrapDatabaseURL.searchParams.delete('schema')

const restrictedConnectionURL = new URL(runtimeDatabaseURL)
restrictedConnectionURL.searchParams.delete('schema')

const createRestrictedClient = (Client) =>
  new Client({
    connectionString: restrictedConnectionURL.toString(),
    options: `-c search_path=${schema}`,
  })

const assertExactRoleAttributes = (role) => {
  if (
    !role ||
    !role.rolcanlogin ||
    role.rolsuper ||
    role.rolinherit ||
    role.rolcreaterole ||
    role.rolcreatedb ||
    role.rolreplication ||
    role.rolbypassrls ||
    role.rolconnlimit !== roleConnectionLimit ||
    role.rolconfig !== null ||
    role.rolvaliduntil !== null
  ) {
    throw new Error(`PostgreSQL role ${databaseRole} did not pass its exact attribute check.`)
  }
}

const assertRoleMembershipIsolation = async (client) => {
  const administratorResult = await client.query(
    'SELECT oid::text FROM pg_roles WHERE rolname = session_user',
  )
  const administratorOid = administratorResult.rows[0]?.oid

  if (!administratorOid) {
    throw new Error('The PostgreSQL bootstrap administrator could not be resolved.')
  }

  const membershipResult = await client.query(
    `SELECT parent.rolname AS parent_role, member.rolname AS member_role,
            member.oid::text AS member_oid, membership.admin_option,
            membership.inherit_option, membership.set_option,
            grantor.rolsuper AS grantor_is_superuser
       FROM pg_auth_members AS membership
       JOIN pg_roles AS member ON member.oid = membership.member
       JOIN pg_roles AS parent ON parent.oid = membership.roleid
       JOIN pg_roles AS grantor ON grantor.oid = membership.grantor
      WHERE member.rolname = $1 OR parent.rolname = $1`,
    [databaseRole],
  )

  const unexpectedMembership = membershipResult.rows.find(
    (membership) =>
      membership.parent_role !== databaseRole ||
      membership.member_oid !== administratorOid ||
      !membership.admin_option ||
      membership.inherit_option ||
      membership.set_option ||
      !membership.grantor_is_superuser,
  )

  if (unexpectedMembership) {
    throw new Error(`Refusing to reuse PostgreSQL role ${databaseRole} with role memberships.`)
  }
}

const secureOwnedRoutines = async (client, grantee) => {
  const routineResult = await client.query(
    `SELECT format(
              '%I.%I(%s)',
              namespace.nspname,
              routine.proname,
              pg_get_function_identity_arguments(routine.oid)
            ) AS signature
       FROM pg_proc AS routine
       JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
      WHERE namespace.nspname = $1
        AND routine.proowner = (
          SELECT oid FROM pg_roles WHERE rolname = current_user
        )`,
    [schema],
  )
  const signatures = routineResult.rows.map((routine) => routine.signature)

  if (signatures.length === 0) return

  const functionList = signatures.join(', ')
  await client.query(`REVOKE ALL PRIVILEGES ON FUNCTION ${functionList} FROM PUBLIC`)

  if (grantee) {
    await client.query(`GRANT EXECUTE ON FUNCTION ${functionList} TO ${grantee}`)
  }
}

const assertRoleIsolation = async (client, roleOid) => {
  const ownershipResult = await client.query(
    `WITH allowed_toast_tables AS (
       SELECT relation.reltoastrelid AS oid
         FROM pg_class AS relation
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE relation.relowner = $1::oid
          AND namespace.nspname = $2
          AND relation.reltoastrelid <> 0
     ),
     allowed_toast_objects AS (
       SELECT oid FROM allowed_toast_tables
       UNION ALL
       SELECT index_entry.indexrelid
         FROM pg_index AS index_entry
         JOIN allowed_toast_tables AS toast_table ON toast_table.oid = index_entry.indrelid
     ),
     unexpected_ownership AS (
       SELECT 'database'::text AS category, NULL::text AS namespace,
              database.datname::text AS object_name
         FROM pg_database AS database
        WHERE database.datdba = $1::oid
       UNION ALL
       SELECT 'schema', namespace.nspname::text, namespace.nspname::text
         FROM pg_namespace AS namespace
        WHERE namespace.nspowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'relation', namespace.nspname::text, relation.relname::text
         FROM pg_class AS relation
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE relation.relowner = $1::oid
          AND namespace.nspname <> $2
          AND NOT (
            namespace.nspname = 'pg_toast'
            AND relation.oid IN (SELECT oid FROM allowed_toast_objects)
          )
       UNION ALL
       SELECT 'routine', namespace.nspname::text, routine.proname::text
         FROM pg_proc AS routine
         JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
        WHERE routine.proowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'type', namespace.nspname::text, data_type.typname::text
         FROM pg_type AS data_type
         JOIN pg_namespace AS namespace ON namespace.oid = data_type.typnamespace
        WHERE data_type.typowner = $1::oid
          AND namespace.nspname <> $2
          AND NOT (
            namespace.nspname = 'pg_toast'
            AND data_type.typrelid IN (SELECT oid FROM allowed_toast_objects)
          )
       UNION ALL
       SELECT 'collation', namespace.nspname::text, collation_entry.collname::text
         FROM pg_collation AS collation_entry
         JOIN pg_namespace AS namespace ON namespace.oid = collation_entry.collnamespace
        WHERE collation_entry.collowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'conversion', namespace.nspname::text, conversion_entry.conname::text
         FROM pg_conversion AS conversion_entry
         JOIN pg_namespace AS namespace ON namespace.oid = conversion_entry.connamespace
        WHERE conversion_entry.conowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'operator', namespace.nspname::text, operator_entry.oprname::text
         FROM pg_operator AS operator_entry
         JOIN pg_namespace AS namespace ON namespace.oid = operator_entry.oprnamespace
        WHERE operator_entry.oprowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'operator-class', namespace.nspname::text, operator_class.opcname::text
         FROM pg_opclass AS operator_class
         JOIN pg_namespace AS namespace ON namespace.oid = operator_class.opcnamespace
        WHERE operator_class.opcowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'operator-family', namespace.nspname::text, operator_family.opfname::text
         FROM pg_opfamily AS operator_family
         JOIN pg_namespace AS namespace ON namespace.oid = operator_family.opfnamespace
        WHERE operator_family.opfowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'text-search-configuration', namespace.nspname::text,
              search_configuration.cfgname::text
         FROM pg_ts_config AS search_configuration
         JOIN pg_namespace AS namespace ON namespace.oid = search_configuration.cfgnamespace
        WHERE search_configuration.cfgowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'text-search-dictionary', namespace.nspname::text,
              search_dictionary.dictname::text
         FROM pg_ts_dict AS search_dictionary
         JOIN pg_namespace AS namespace ON namespace.oid = search_dictionary.dictnamespace
        WHERE search_dictionary.dictowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'extended-statistics', namespace.nspname::text,
              extended_statistics.stxname::text
         FROM pg_statistic_ext AS extended_statistics
         JOIN pg_namespace AS namespace ON namespace.oid = extended_statistics.stxnamespace
        WHERE extended_statistics.stxowner = $1::oid
          AND namespace.nspname <> $2
       UNION ALL
       SELECT 'extension', namespace.nspname::text, extension_entry.extname::text
         FROM pg_extension AS extension_entry
         JOIN pg_namespace AS namespace ON namespace.oid = extension_entry.extnamespace
        WHERE extension_entry.extowner = $1::oid
       UNION ALL
       SELECT 'large-object', NULL, large_object.oid::text
         FROM pg_largeobject_metadata AS large_object
        WHERE large_object.lomowner = $1::oid
       UNION ALL
       SELECT 'foreign-data-wrapper', NULL, foreign_wrapper.fdwname::text
         FROM pg_foreign_data_wrapper AS foreign_wrapper
        WHERE foreign_wrapper.fdwowner = $1::oid
       UNION ALL
       SELECT 'foreign-server', NULL, foreign_server.srvname::text
         FROM pg_foreign_server AS foreign_server
        WHERE foreign_server.srvowner = $1::oid
       UNION ALL
       SELECT 'language', NULL, language_entry.lanname::text
         FROM pg_language AS language_entry
        WHERE language_entry.lanowner = $1::oid
       UNION ALL
       SELECT 'tablespace', NULL, tablespace_entry.spcname::text
         FROM pg_tablespace AS tablespace_entry
        WHERE tablespace_entry.spcowner = $1::oid
       UNION ALL
       SELECT 'publication', NULL, publication_entry.pubname::text
         FROM pg_publication AS publication_entry
        WHERE publication_entry.pubowner = $1::oid
       UNION ALL
       SELECT 'subscription', NULL, subscription_entry.subname::text
         FROM pg_subscription AS subscription_entry
        WHERE subscription_entry.subowner = $1::oid
       UNION ALL
       SELECT 'event-trigger', NULL, event_trigger.evtname::text
         FROM pg_event_trigger AS event_trigger
        WHERE event_trigger.evtowner = $1::oid
     )
     SELECT category, namespace, object_name
       FROM unexpected_ownership
      LIMIT 1`,
    [roleOid, schema],
  )

  if (ownershipResult.rows.length > 0) {
    const [ownedObject] = ownershipResult.rows
    const qualifiedName = [ownedObject.namespace, ownedObject.object_name].filter(Boolean).join('.')

    throw new Error(
      `Refusing to reuse PostgreSQL role ${databaseRole}: it owns unexpected ${ownedObject.category} ${qualifiedName}.`,
    )
  }

  const aclResult = await client.query(
    `WITH unexpected_acl AS (
       SELECT 'database'::text AS category, NULL::text AS namespace,
              database.datname::text AS object_name, acl.privilege_type
         FROM pg_database AS database
         CROSS JOIN LATERAL aclexplode(database.datacl) AS acl
        WHERE acl.grantee = $1::oid
          AND (
            database.datname <> current_database()
            OR acl.privilege_type <> 'CONNECT'
            OR acl.is_grantable
          )
       UNION ALL
       SELECT 'schema', namespace.nspname::text, namespace.nspname::text, acl.privilege_type
         FROM pg_namespace AS namespace
         CROSS JOIN LATERAL aclexplode(namespace.nspacl) AS acl
        WHERE acl.grantee = $1::oid
          AND (namespace.nspname <> $2 OR acl.is_grantable)
       UNION ALL
       SELECT 'relation', namespace.nspname::text, relation.relname::text, acl.privilege_type
         FROM pg_class AS relation
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         CROSS JOIN LATERAL aclexplode(relation.relacl) AS acl
        WHERE acl.grantee = $1::oid
          AND (namespace.nspname <> $2 OR acl.is_grantable)
       UNION ALL
       SELECT 'column', namespace.nspname::text,
              (relation.relname::text || '.' || attribute.attname::text), acl.privilege_type
         FROM pg_attribute AS attribute
         JOIN pg_class AS relation ON relation.oid = attribute.attrelid
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         CROSS JOIN LATERAL aclexplode(attribute.attacl) AS acl
        WHERE acl.grantee = $1::oid
          AND (namespace.nspname <> $2 OR acl.is_grantable)
       UNION ALL
       SELECT 'routine', namespace.nspname::text, routine.proname::text, acl.privilege_type
         FROM pg_proc AS routine
         JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
         CROSS JOIN LATERAL aclexplode(routine.proacl) AS acl
        WHERE acl.grantee = $1::oid
          AND (namespace.nspname <> $2 OR acl.is_grantable)
       UNION ALL
       SELECT 'type', namespace.nspname::text, data_type.typname::text, acl.privilege_type
         FROM pg_type AS data_type
         JOIN pg_namespace AS namespace ON namespace.oid = data_type.typnamespace
         CROSS JOIN LATERAL aclexplode(data_type.typacl) AS acl
        WHERE acl.grantee = $1::oid
          AND (namespace.nspname <> $2 OR acl.is_grantable)
       UNION ALL
       SELECT 'language', NULL, language_entry.lanname::text, acl.privilege_type
         FROM pg_language AS language_entry
         CROSS JOIN LATERAL aclexplode(language_entry.lanacl) AS acl
        WHERE acl.grantee = $1::oid
       UNION ALL
       SELECT 'large-object', NULL, large_object.oid::text, acl.privilege_type
         FROM pg_largeobject_metadata AS large_object
         CROSS JOIN LATERAL aclexplode(large_object.lomacl) AS acl
        WHERE acl.grantee = $1::oid
       UNION ALL
       SELECT 'foreign-data-wrapper', NULL, foreign_wrapper.fdwname::text, acl.privilege_type
         FROM pg_foreign_data_wrapper AS foreign_wrapper
         CROSS JOIN LATERAL aclexplode(foreign_wrapper.fdwacl) AS acl
        WHERE acl.grantee = $1::oid
       UNION ALL
       SELECT 'foreign-server', NULL, foreign_server.srvname::text, acl.privilege_type
         FROM pg_foreign_server AS foreign_server
         CROSS JOIN LATERAL aclexplode(foreign_server.srvacl) AS acl
        WHERE acl.grantee = $1::oid
       UNION ALL
       SELECT 'tablespace', NULL, tablespace_entry.spcname::text, acl.privilege_type
         FROM pg_tablespace AS tablespace_entry
         CROSS JOIN LATERAL aclexplode(tablespace_entry.spcacl) AS acl
        WHERE acl.grantee = $1::oid
       UNION ALL
       SELECT 'parameter', NULL, parameter_entry.parname::text, acl.privilege_type
         FROM pg_parameter_acl AS parameter_entry
         CROSS JOIN LATERAL aclexplode(parameter_entry.paracl) AS acl
        WHERE acl.grantee = $1::oid
     )
     SELECT category, namespace, object_name, privilege_type
       FROM unexpected_acl
      LIMIT 1`,
    [roleOid, schema],
  )

  if (aclResult.rows.length > 0) {
    const [acl] = aclResult.rows
    const qualifiedName = [acl.namespace, acl.object_name].filter(Boolean).join('.')

    throw new Error(
      `Refusing to reuse PostgreSQL role ${databaseRole}: unexpected ${acl.privilege_type} privilege on ${acl.category} ${qualifiedName}.`,
    )
  }

  const defaultAclResult = await client.query(
    `SELECT COALESCE(namespace.nspname, '<all-schemas>') AS namespace,
            default_acl.defaclobjtype AS object_type
       FROM pg_default_acl AS default_acl
       LEFT JOIN pg_namespace AS namespace ON namespace.oid = default_acl.defaclnamespace
      WHERE (default_acl.defaclnamespace = 0 OR namespace.nspname <> $2)
        AND (
          default_acl.defaclrole = $1::oid
          OR EXISTS (
            SELECT 1
              FROM aclexplode(default_acl.defaclacl) AS acl
             WHERE acl.grantee = $1::oid
          )
        )
      LIMIT 1`,
    [roleOid, schema],
  )

  if (defaultAclResult.rows.length > 0) {
    const [defaultAcl] = defaultAclResult.rows

    throw new Error(
      `Refusing to reuse PostgreSQL role ${databaseRole}: unexpected default ${defaultAcl.object_type} privileges in ${defaultAcl.namespace}.`,
    )
  }

  const settingResult = await client.query(
    `SELECT database.datname, setting.setconfig
       FROM pg_db_role_setting AS setting
       LEFT JOIN pg_database AS database ON database.oid = setting.setdatabase
      WHERE setting.setrole = $1::oid
      LIMIT 1`,
    [roleOid],
  )

  if (settingResult.rows.length > 0) {
    throw new Error(
      `Refusing to reuse PostgreSQL role ${databaseRole} with unexpected database settings.`,
    )
  }
}

const prepareDatabase = async () => {
  const { default: postgres } = await import('pg')
  const { Client } = postgres
  const adminClient = new Client({ connectionString: bootstrapDatabaseURL.toString() })
  const quotedRole = quoteIdentifier(databaseRole)
  const quotedSchema = quoteIdentifier(schema)

  try {
    await adminClient.connect()
    await adminClient.query('BEGIN')
    await adminClient.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      'saberistic-umami-role-bootstrap',
    ])

    const initialRoleResult = await adminClient.query(
      `SELECT oid, rolcanlogin, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
              rolreplication, rolbypassrls, rolconnlimit, rolconfig, rolvaliduntil
         FROM pg_roles
        WHERE rolname = $1`,
      [databaseRole],
    )

    if (initialRoleResult.rows.length === 0) {
      const passwordResult = await adminClient.query(
        'SELECT quote_literal($1::text) AS password_literal',
        [databasePassword],
      )

      await adminClient.query(
        `CREATE ROLE ${quotedRole}
           WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
                NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${roleConnectionLimit}
                PASSWORD ${passwordResult.rows[0].password_literal}`,
      )
    }

    const roleResult = await adminClient.query(
      `SELECT oid, rolcanlogin, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
              rolreplication, rolbypassrls, rolconnlimit, rolconfig, rolvaliduntil
         FROM pg_roles
        WHERE rolname = $1`,
      [databaseRole],
    )
    const [role] = roleResult.rows
    const roleOid = role?.oid

    if (!roleOid) {
      throw new Error(`PostgreSQL role ${databaseRole} could not be resolved for verification.`)
    }

    assertExactRoleAttributes(role)
    await assertRoleMembershipIsolation(adminClient)
    await assertRoleIsolation(adminClient, roleOid)

    const databaseResult = await adminClient.query('SELECT current_database() AS name')
    const databaseName = databaseResult.rows[0].name
    const quotedDatabase = quoteIdentifier(databaseName)

    await adminClient.query(
      `REVOKE CREATE, TEMPORARY ON DATABASE ${quotedDatabase} FROM ${quotedRole}`,
    )
    await adminClient.query(`GRANT CONNECT ON DATABASE ${quotedDatabase} TO ${quotedRole}`)

    await adminClient.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`)
    await adminClient.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA ${quotedSchema}`)
    await adminClient.query(`REVOKE ALL PRIVILEGES ON SCHEMA ${quotedSchema} FROM PUBLIC`)
    await secureOwnedRoutines(adminClient, quotedRole)
    await adminClient.query(`GRANT USAGE, CREATE ON SCHEMA ${quotedSchema} TO ${quotedRole}`)

    await adminClient.query('COMMIT')
  } catch (error) {
    await adminClient.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await adminClient.end().catch(() => undefined)
  }

  const restrictedClient = createRestrictedClient(Client)

  try {
    await restrictedClient.connect()
    const identity = await restrictedClient.query(
      'SELECT current_user AS role, current_schema() AS schema',
    )

    if (identity.rows[0]?.role !== databaseRole || identity.rows[0]?.schema !== schema) {
      throw new Error(
        'The restricted PostgreSQL connection did not select the expected role and schema.',
      )
    }

    await restrictedClient.query(
      `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${quotedSchema} FROM PUBLIC`,
    )
    await restrictedClient.query(
      `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${quotedSchema} FROM PUBLIC`,
    )
    await secureOwnedRoutines(restrictedClient)
    await restrictedClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchema} REVOKE ALL ON TABLES FROM PUBLIC`,
    )
    await restrictedClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchema} REVOKE ALL ON SEQUENCES FROM PUBLIC`,
    )
    await restrictedClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchema} REVOKE ALL ON FUNCTIONS FROM PUBLIC`,
    )
    await restrictedClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchema} REVOKE ALL ON TYPES FROM PUBLIC`,
    )
  } finally {
    await restrictedClient.end().catch(() => undefined)
  }
}

const childEnvironment = {
  ...process.env,
  DATABASE_URL: runtimeDatabaseURL.toString(),
  DIRECT_DATABASE_URL: runtimeDatabaseURL.toString(),
  PATH: `${process.cwd()}/node_modules/.bin:${process.env.PATH ?? ''}`,
  TWO_FACTOR_ENCRYPTION_KEY: twoFactorEncryptionKey,
}

delete childEnvironment.UMAMI_DATABASE_ADMIN_URL
delete childEnvironment.UMAMI_DATABASE_PASSWORD
delete childEnvironment.UMAMI_ADMIN_PASSWORD
delete childEnvironment.UMAMI_TWO_FACTOR_SEED
delete process.env.UMAMI_DATABASE_ADMIN_URL
delete process.env.UMAMI_DATABASE_PASSWORD
delete process.env.UMAMI_ADMIN_PASSWORD
delete process.env.UMAMI_TWO_FACTOR_SEED

const secureBootstrapAdministrator = async () => {
  const [{ default: postgres }, bcrypt] = await Promise.all([import('pg'), import('bcryptjs')])
  const { Client } = postgres
  const comparePassword = bcrypt.compare ?? bcrypt.default?.compare
  const hashPassword = bcrypt.hash ?? bcrypt.default?.hash

  if (!comparePassword || !hashPassword) {
    throw new Error('The bundled bcrypt password helper is unavailable.')
  }

  const restrictedClient = createRestrictedClient(Client)
  const userTable = `${quoteIdentifier(schema)}."user"`

  try {
    await restrictedClient.connect()
    await restrictedClient.query('BEGIN')
    const bootstrapAdministrator = await restrictedClient.query(
      `SELECT user_id, username, password, role, deleted_at
         FROM ${userTable}
        WHERE user_id = $1
          FOR UPDATE`,
      [administratorId],
    )

    if (bootstrapAdministrator.rows.length !== 1) {
      throw new Error('The expected Umami bootstrap administrator does not exist.')
    }

    const [administrator] = bootstrapAdministrator.rows

    if (administrator.role !== 'admin' || administrator.deleted_at !== null) {
      throw new Error('The Umami bootstrap administrator is not an active administrator.')
    }

    const passwordMatches = await comparePassword(administratorPassword, administrator.password)

    if (administrator.username !== administratorUsername || !passwordMatches) {
      const passwordHash = passwordMatches
        ? administrator.password
        : await hashPassword(administratorPassword, 10)
      const updateResult = await restrictedClient.query(
        `UPDATE ${userTable}
            SET username = $1, password = $2, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3`,
        [administratorUsername, passwordHash, administratorId],
      )

      if (updateResult.rowCount !== 1) {
        throw new Error('The Umami bootstrap administrator could not be secured.')
      }
    }

    const verificationResult = await restrictedClient.query(
      `SELECT username, password, role, deleted_at
         FROM ${userTable}
        WHERE user_id = $1`,
      [administratorId],
    )
    const [verifiedAdministrator] = verificationResult.rows

    if (
      !verifiedAdministrator ||
      verifiedAdministrator.username !== administratorUsername ||
      verifiedAdministrator.role !== 'admin' ||
      verifiedAdministrator.deleted_at !== null ||
      !(await comparePassword(administratorPassword, verifiedAdministrator.password))
    ) {
      throw new Error('The Umami bootstrap administrator did not pass verification.')
    }

    await restrictedClient.query('COMMIT')
  } catch (error) {
    await restrictedClient.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await restrictedClient.end().catch(() => undefined)
  }
}

try {
  process.setgroups([nextjsGroupId])
} catch {
  fail('Unable to constrain the Umami supervisor supplementary groups.')
}

if (process.getuid() !== 0) {
  fail('The Umami supervisor unexpectedly lost its root identity before spawning the child.')
}

const forwardedSignals = ['SIGINT', 'SIGTERM']
let activeChild

const removeSignalHandlers = () => {
  for (const signal of forwardedSignals) {
    process.removeListener(signal, signalHandlers[signal])
  }
}

const signalHandlers = Object.fromEntries(
  forwardedSignals.map((signal) => [
    signal,
    () => {
      if (activeChild) {
        activeChild.kill(signal)
        return
      }

      removeSignalHandlers()
      process.kill(process.pid, signal)
    },
  ]),
)

for (const signal of forwardedSignals) {
  process.on(signal, signalHandlers[signal])
}

const runAsNextjs = (childCommand, childArgs, description) =>
  new Promise((resolve, reject) => {
    const child = spawn(childCommand, childArgs, {
      env: childEnvironment,
      gid: nextjsGroupId,
      stdio: 'inherit',
      uid: nextjsUserId,
    })
    activeChild = child
    let settled = false

    child.once('error', (error) => {
      if (settled) return
      settled = true
      activeChild = undefined
      reject(new Error(`${description} could not start: ${error.message}`))
    })

    child.once('exit', (code, signal) => {
      if (settled) return
      settled = true
      activeChild = undefined

      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${description} exited with ${signal ?? `code ${code ?? 1}`}.`))
    })
  })

try {
  await prepareDatabase()
  await runAsNextjs(process.execPath, ['scripts/check-db.js'], 'Umami migration preflight')
  await secureBootstrapAdministrator()
} catch (error) {
  removeSignalHandlers()
  const message = error instanceof Error ? error.message : 'Unknown bootstrap error.'
  fail(`Unable to complete the secure Umami bootstrap: ${message}`)
}

const child = spawn(command, args, {
  env: childEnvironment,
  gid: nextjsGroupId,
  stdio: 'inherit',
  uid: nextjsUserId,
})
activeChild = child

child.once('error', (error) => {
  removeSignalHandlers()
  console.error(`Unable to start Umami: ${error.message}`)
  process.exit(1)
})

child.once('exit', (code, signal) => {
  activeChild = undefined
  removeSignalHandlers()

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
