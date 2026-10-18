import React, { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input } from '@all/ui'

interface NameDialogProps {
  open: boolean
  title: string
  description?: string
  fieldLabel: string
  initialValue: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: (value: string) => void
  onClose: () => void
}

/** Small dialog with a single file-name field, used for both "Rename" and "Export". */
export function NameDialog({
  open,
  title,
  description,
  fieldLabel,
  initialValue,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: NameDialogProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return undefined
    setValue(initialValue)
    // The dialog renders in a portal, so focus the field once it is mounted.
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => clearTimeout(timer)
  }, [open, initialValue])

  const submit = () => {
    if (value.trim()) onConfirm(value)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={submit} disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Input
          ref={inputRef}
          label={fieldLabel}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          fullWidth
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </Dialog>
  )
}
