import * as React from 'react';
import * as ReactDom from 'react-dom';
import { HashRouter as Router } from "react-router-dom";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'AtRiskAgreementsWebPartStrings';
import { IAppProps } from './data/props';
import Strings, { setContext } from '../../strings';
import { App } from './App';

export interface IAtRiskAgreementsWebPartProps {
  description: string;
  title: string;
}

const ensureSharePointWebViewMode = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const currentUrl = new URL(window.location.href);

  if (currentUrl.searchParams.get("env") === "WebView") {
    return false;
  }

  currentUrl.searchParams.set("env", "WebView");
  window.location.replace(currentUrl.toString());
  return true;
};

export default class AtRiskAgreementsWebPart extends BaseClientSideWebPart<IAtRiskAgreementsWebPartProps> {

  public render(): void {

    if (ensureSharePointWebViewMode()) {
      return;
    }

    // set the context
    setContext(this.context);

    const appElement: React.ReactElement<IAppProps> = React.createElement(
      App,
      {
        context: this.context,
        wpTitle: this.properties.title,
      }
    );

    // install Router on parent to use throughout
    const routerElement = React.createElement(
      Router,
      null,
      appElement
    )

    ReactDom.render(routerElement, this.domElement);
  }

  //Default title for first install/render
  protected async onInit(): Promise<void> {
    if (!this.properties.title) {
      this.properties.title = "At-Risk Agreements";
    }
    return super.onInit();
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: `Application version: v${Strings.Version}`
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('title', {
                  label: "Application Title"
                }),
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
