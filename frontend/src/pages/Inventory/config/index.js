import lang from '@/lang/language';

const entity = 'inventory'; // Updated entity name

const Labels = {
  PANEL_TITLE: lang.product,
  DATATABLE_TITLE: lang.product_list,
  ADD_NEW_ENTITY: lang.add_new_product,
  ENTITY_NAME: lang.product,
  CREATE_ENTITY: lang.save,
  UPDATE_ENTITY: lang.update,
};

const configPage = {
  entity,
  ...Labels,
};

export default configPage;
