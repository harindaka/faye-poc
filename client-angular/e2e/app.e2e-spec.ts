import { FayePocClientWebPage } from './app.po';

describe('faye-poc-client-web App', () => {
  let page: FayePocClientWebPage;

  beforeEach(() => {
    page = new FayePocClientWebPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
