# Nanotation browser extension

Prototype Chrome extension to enable "deep link" sharing of a selection, with anyone else who has this extension.

You can try this out from the [Nanotation extension on the Chrome web store](https://chrome.google.com/webstore/detail/nanotation/eofaggkpbjobpbeafahaflnjkmgjlipo).

Provides a context menu item that lets you copy a link to a text selection. This link includes a custom query parameter (`text`) used by this extension. When that custom link is followed, the Nanotation extension decodes the `text` parameter and searches for that text; if it finds it, it highlights the selection text in the shared document and scrolls to the parent block element for the selection.

This is very simplistic, but it doesn't require any special server, social service, or persistent resource. It's just a link. If the recipient doesn't have the Nanotation browser extension installed, they'll still end up on the right page, just not at the right selection.

This extension doesn't (and won't) collect or send any information, personal or otherwise, to anyone else. It operates completely in the browser, and is as private as possible. It doesn't collect usage statistics, and I don't see a reason for it to ever do so. In the future, it might use localStorage ("big cookies") to maintain personal history on the user's own computer, but that would just be for convenience.

This extension is partly intended to spark conversation about standardization of similar functionality, so it could be natively implemented in browsers. This would make it much more usable and useful.

Issues and PRs welcome!

## Known limits
- Recipient must also have Nanotation browser extension installed
- Doesn't allow you to make a selection that crosses element boundaries (i.e. you can't share a link that starts in one paragraph or list item and ends in another).
- Doesn't account for changes in spelling or other text changes
- Only finds the first match, not necessarily the specific selection the user shared
- Only one selection per page
- No persistence
- Practical URL character length limits apply _(extent not tested)_
- ~~Doesn't allow user to add comments (yet)~~
- Haven't tested accessibility, and it's probably terrible… maybe add focus to the parent element?
- Very generic icon
- Seems buggy sometimes

## TODO
- ~~Provide interface to allow short comments, via `title` attribute on `<mark>` element~~
- If there's a nearby element (parent or section header) that has an `id`, include that in the URL, and use that instead of auto-scrolling
- Create matching extensions for other browsers, like Firefox, Edge, and Safari.

## More details
Loosely based on draft W3C Web Annotation specifications, such as the [RangeFinder API draft](http://w3c.github.io/rangefinder/).

For a real annotation extension, see [Hypothes.is](https://web.hypothes.is/). That's a pretty awesome project.

See also discussions on Twitter:
- Request by [Scott Vinkle (@svinkle), 2017 Dec 22](https://twitter.com/svinkle/status/944249198274400256), with some discussion by standards folks.
- Follow-up by me [Doug Schepers (@shepazu), 2017 Dec 22](https://twitter.com/shepazu/status/944344386040680448), with not much interest from others, but I wanted to learn how to make a Chrome extension anyway, and I really like annotations, so I threw this together in a couple days.
