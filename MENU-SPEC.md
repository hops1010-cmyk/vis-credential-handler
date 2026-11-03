# Menu specification — vis-credential-handler

Pete's app menu branches, recorded for later implementation:

```text
File | Edit | Settings |

file -new -open -save -delete -exit
edit -cut -copy -paste
settings -vaultskin -configuration
```

Here File/Edit/Settings are categories in the direct form; each single-dash item is a main branch. A nested menu path can use `menu -file --new`: menu is category, -file main branch, --new first-level sub-branch. Listing sibling branches is not a request to run them all. Application menu definitions do not automatically register global Tower commands.

- File: New/Open/Save/Delete/Exit; exact edited object scope remains a Design decision. Do not infer live credential deletion or rotation from the label alone.
- Edit: Cut/Copy/Paste for selected editable fields. Sensitive fields require deliberate clipboard handling with current grant checks; no default display, logging or broad clipboard scraping. Browser clipboard capability/permission may require user interaction. Do not promise erasure from OS clipboard history or other apps. Paste accepts only the expected field data; never evaluates commands or code.
- Settings → vaultskin: selects the vault's appearance, following VISTAMATIONS skin tokens. Visual concealment or changing a skin does not change permissions or underlying secret storage.
- Settings → configuration: opens named connector/permission/session/backup settings once designed. Public-safe config can be versioned/backed up; credential values remain in verified private storage. Profile/app/global configuration scope must be explicit.

This file records required menu labels and boundaries. No menu, clipboard handler, skin switch or configuration editor has been implemented. Overall app phase remains Entry/Plan pending the relevant next-phase instruction.
