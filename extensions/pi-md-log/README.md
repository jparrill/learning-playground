# pi-md-log

Pi extension that logs assistant messages and [ask_user](https://github.com/kanker2/pi-ask-user) questionnaires to Markdown.

## Install

```bash
pi install git:github.com/kanker2/pi-md-log
```

Reload Pi after installation with `/reload`, or restart it.

## Usage

```text
/md-log notes/session.md   # enable logging
/md-log                     # show current file
/md-log off                 # disable logging
```

The extension creates or updates frontmatter with `created`, `modified`, and `pi_session`.
It records visible assistant text and structured answers from `ask_user`; user messages,
thinking blocks, and other tool calls/results are not logged.

## License

MIT
