/* eslint-env mocha */

import { expect } from 'chai';

import { toPDFMake, createElement } from './index';

describe('#jsx-pdf', () => {
  describe('basics', () => {
    it('should return the pdfmake document definition for simple components', () => {
      expect(toPDFMake(<document>
        <content>hello</content>
      </document>)).to.deep.equal({
        content: {
          stack: ['hello'],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should return the pdfmake document definition for complex trees of components', () => {
      expect(
        toPDFMake((
          <document>
            <content>
              <text>first</text>
              <text>second</text>
            </content>
          </document>
        )),
      ).to.deep.equal({
        content: {
          stack: [
            { text: 'first' },
            { text: 'second' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should support numbers inside jsx', () => {
      expect(toPDFMake(<document>
        <content>{ 123 }</content>
      </document>)).to.deep.equal({
        content: {
          stack: [123],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should concatenate consecutive numbers rather than adding them', () => {
      expect(toPDFMake(<document>
        <content>{ 123 }{ 456 }</content>
      </document>)).to.deep.equal({
        content: {
          stack: ['123456'],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });
  });

  describe('component functions', () => {
    it('should traverse composite components', () => {
      const Component = () => (<text>hello</text>);

      expect(toPDFMake(<document>
        <content><Component /></content>
      </document>)).to.deep.equal({
        content: {
          stack: [
            { text: 'hello' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should traverse nested composite components', () => {
      const ChildComponent = () => (<text>hello</text>);
      const Component = () => (<group><ChildComponent /></group>);

      expect(toPDFMake(<document>
        <content><Component /></content>
      </document>)).to.deep.equal({
        content: {
          stack: [
            {
              stack: [{ text: 'hello' }],
            },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should support object', () => {
      const fragment = <text>test</text>;

      expect(toPDFMake(<document><content>{fragment}</content></document>)).to.deep.equal({
        content: {
          stack: [
            { text: 'test' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should join resulting text elements together', () => {
      const Name = () => ('Mr. Test');

      expect(toPDFMake(
        <document>
          <content>
            <text>Hello <Name />!</text>
          </content>
        </document>,
      )).to.deep.equal({
        content: {
          stack: [
            { text: 'Hello Mr. Test!' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });
  });

  it('should ignore falsy values', () => {
    expect(toPDFMake(<document>
      <content>Hello{ null }{ undefined }{ '' }{ 0 }{ NaN }{ false }!</content>
    </document>)).to.deep.equal({
      content: {
        stack: ['Hello!'],
      },
      defaultStyle: {
        font: 'OpenSans',
        fontSize: 10,
      },
    });
  });

  it('should ignore wrapped falsy values', () => {
    const Null = () => null;
    const Undefined = () => {};
    const Empty = () => '';
    const Zero = () => 0;
    const NAN = () => NaN;
    const False = () => (() => false)();

    expect(toPDFMake(
      <document>
        <content>
          <text>Hello<Null /><Undefined /><Empty /><Zero /><NAN /><False />!</text>
        </content>
      </document>,
    )).to.deep.equal({
      content: {
        stack: [
          { text: 'Hello!' },
        ],
      },
      defaultStyle: {
        font: 'OpenSans',
        fontSize: 10,
      },
    });
  });

  describe('higher order components', () => {
    it('should allow higher order components', () => {
      const Component = attributes => <text>{attributes.children}</text>;

      expect(toPDFMake(
        <document>
          <content>
            <Component>hello</Component>
          </content>
        </document>),
      ).to.deep.equal({
        content: {
          stack: [
            { text: 'hello' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });
  });

  describe('context', () => {
    it('should pass context to children', () => {
      const Provider = (attributes, context, updateContext) => {
        updateContext({ mytest: 'test' });
        return attributes.children[0];
      };

      const MyContextualisedComponent = (attributes, context) => <text>{ context.mytest }</text>;

      expect(toPDFMake(
        (<Provider>
          <document>
            <content>
              <MyContextualisedComponent />
            </content>
          </document>
        </Provider>),
      )).to.deep.equal({
        content: {
          stack: [
            { text: 'test' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should not pass context to siblings', () => {
      const Provider = (attributes, context, updateContext) => {
        updateContext({ mytest: 'this should not exist in the sibling' });
        return (<text>first</text>);
      };

      const SiblingProvider = (attributes, context) => <text>{ context.mytest || 'it worked' }</text>;

      expect(toPDFMake((
        <document>
          <content>
            <Provider />
            <SiblingProvider />
          </content>
        </document>
      ))).to.deep.equal({
        content: {
          stack: [
            { text: 'first' },
            { text: 'it worked' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });


    it('should pass context to grandchildren', () => {
      const Provider = (attributes, context, updateContext) => {
        updateContext({ mytest: 'test' });
        return attributes.children[0];
      };

      const MyContextualisedComponent = (attributes, context) => <text>{ context.mytest }</text>;
      const MyParentComponent = () => <MyContextualisedComponent />;

      expect(toPDFMake(
        (<Provider>
          <document>
            <content>
              <MyParentComponent />
            </content>
          </document>
        </Provider>),
      )).to.deep.equal({
        content: {
          stack: [
            { text: 'test' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });
  });

  describe('document', () => {
    it('should set page margin', () => {
      expect(toPDFMake(
        (<document margin={10} />),
      )).to.deep.equal({
        pageMargins: 10,
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });

    it('should error if a top level element appears below the top level', () => {
      expect(() => {
        toPDFMake(
          <document>
            <content>
              <group><header /></group>
            </content>
          </document>,
        );
      }).to.throw(Error, /immediate descendents/);
    });

    it('should error if document is not the root element', () => {
      expect(() => {
        toPDFMake(<group><text>foobar</text></group>);
      }).to.throw(Error, /root/);
    });

    it('should error if a document appears below the top level', () => {
      expect(() => {
        toPDFMake(<document><content><document /></content></document>);
      }).to.throw(Error, /root/);
    });

    it('should not error if a top level element appears nested inside a function component', () => {
      const Nested = () => (<content />);

      expect(() => {
        toPDFMake(<document><Nested /></document>);
      }).to.not.throw(Error);
    });

    it('should resolve functional top level elements', () => {
      const Component = () => (<content><text>test</text></content>);

      expect(toPDFMake(<document>
        <Component />
      </document>)).to.deep.equal({
        content: {
          stack: [
            { text: 'test' },
          ],
        },
        defaultStyle: {
          font: 'OpenSans',
          fontSize: 10,
        },
      });
    });
  });
});
