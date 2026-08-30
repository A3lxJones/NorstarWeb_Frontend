/**
 * One-off backfill: encrypt personal data already sitting in the database.
 *
 * Safe by design:
 *   - Dry run unless `--apply` is passed.
 *   - Only ever UPDATEs the specific PII columns of a single row at a time.
 *     Nothing is deleted, and no other column (including updated_at) is touched.
 *   - Idempotent: rows that are already ciphertext are skipped, so it can be
 *     re-run after a partial or interrupted pass.
 *   - The app works before, during and after the run, because the decrypt
 *     helper passes plaintext through unchanged.
 *
 * Usage:
 *     npm run build:ts
 *     node dist/scripts/encrypt-existing-pii.js            # dry run, no writes
 *     node dist/scripts/encrypt-existing-pii.js --apply    # perform the writes
 */

import dotenv from "dotenv";

dotenv.config();

import { supabaseAdmin } from "../server-api/config/supabase";
import { encryptField, isEncrypted } from "../server-api/utils/encryption";

const APPLY = process.argv.includes("--apply");

interface Target {
    table: string;
    columns: string[];
}

const TARGETS: Target[] = [
    { table: "profiles", columns: ["email", "phone"] },
    { table: "children", columns: ["emergency_contact_phone"] },
];

async function backfill(target: Target): Promise<void> {
    const { table, columns } = target;

    const { data, error } = await supabaseAdmin
        .from(table)
        .select(["id", ...columns].join(", "));

    if (error) {
        throw new Error(`Failed to read ${table}: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as Record<string, string | null>[];
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
        const patch: Record<string, string | null> = {};

        for (const column of columns) {
            const value = row[column];
            if (value === null || value === undefined || value === "" || isEncrypted(value)) {
                continue;
            }
            patch[column] = encryptField(value);
        }

        if (Object.keys(patch).length === 0) {
            skipped += 1;
            continue;
        }

        if (APPLY) {
            const { error: updateError } = await supabaseAdmin
                .from(table)
                .update(patch)
                .eq("id", row.id);

            if (updateError) {
                throw new Error(`Failed to update ${table} row ${row.id}: ${updateError.message}`);
            }
        }

        updated += 1;
    }

    console.log(
        `${table}: ${updated} row(s) ${APPLY ? "encrypted" : "would be encrypted"}, ` +
        `${skipped} already encrypted or empty (${rows.length} total).`
    );
}

async function main(): Promise<void> {
    // Fail before touching anything if the key is missing or malformed.
    encryptField("preflight");

    if (!APPLY) {
        console.log("DRY RUN — no changes will be written. Re-run with --apply to commit.\n");
    }

    for (const target of TARGETS) {
        await backfill(target);
    }

    if (APPLY) {
        console.log(
            "\nDone. Keep PII_ENCRYPTION_KEY safe and backed up — without it these " +
            "values cannot be recovered."
        );
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
