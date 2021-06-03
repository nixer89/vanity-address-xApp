import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'highlightSearch'
  })
  export class HighlightSearchPipe implements PipeTransform {
  
    transform(value: string, search: string): string {
      try {
        const valueStr = value + ''; // Ensure numeric values are converted to strings
        search = search.replace('*','').replace('(', '').replace(')','').replace('?', '').replace('.', '').replace('+','');
        return valueStr.replace(new RegExp('(?![^&;]+;)(?!<[^<>]*)(' + search + ')(?![^<>]*>)(?![^&;]+;)', 'gi'), '<strong class="xumm-red">$1</strong>');
      } catch(err) {
        console.log(err);
        console.log("error on value: " + value + " and search: " + search);
        return "";
      }
    }
  }