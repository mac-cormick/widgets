<?php

use Helpers;

require_once "amoapi.php";

/**
 * Created by PhpStorm.
 * User: denis
 * Date: 24.02.17
 * Time: 14:53
 */
class Widget extends \Helpers\Widgets {
	const AMO_CUSTOMERS_TYPE = 12;

	const AMO_LEADS_TYPE = 2;

	const AMO_CONTACTS_TYPE = 1;

	const AMO_COMPANIES_TYPE = 3;

	const NAME_PATTERN = '/{Название}/i';

	const RESPONSIBLE_USER_PATTERN = '/{Отв-ный}/i';

	const RESPONSIBLE_USER_PHONE_PATTERN = '/{Тел отв-ного}/i';

	const RESPONSIBLE_USER_EMAIL_PATTERN = '/{E-mail отв-ного}/i';

	const NEW_MARKERS_PATTERN = '/{{(lead(s)*|customers|contacts|companies)\.(id|responsible_user|responsible_user_phone|responsible_user_email|price|next_date|next_price|cf\.([0-9]+))}}/i';

	//Коды ошибок виджета

	const CONTACT_NOT_FOUND = 'amo_main_contact_not_found';

	const PHONES_NOT_FOUND = 'amo_contacts_phone_not_found';

	const EMPTY_MESSAGE = 'amo_empty_message';

	const EMPTY_ENTITY_ID = 'amo_empty_entity_id';

	const EMPTY_ENTITY_TYPE = 'amo_empty_entity_type';

	const EMPTY_ENTITY_DATA = 'amo_empty_entity_data';

	//id-заглушка для номеров телефонов, не привязанных к контакту (данный кейс возможен при отправке с фронта)
	const AMO_CONTACT_ID_STUB = -1;

	//Типы кастомных полей

	const CF_DATE_TYPE = 6;

	const CF_BIRTHDAY_TYPE = 14;

	const AMO_USER_ROBOT = 0;

	/** @var array */
	private $_entity_types = [
		self::AMO_CUSTOMERS_TYPE => 'customers',
		self::AMO_LEADS_TYPE => 'leads',
		self::AMO_CONTACTS_TYPE => 'contacts',
		self::AMO_COMPANIES_TYPE => 'companies'
	];

	/** @var  string */
	private $_login;

	private $_password;

	/** @var  string */
	private $_from;

	/** @var amoapi */
	private $amo_api;

	/** @var array */
	private $keys = [
		'event',
		'action',
	];

	/** @var array */
	private $keys_sms = [
		'text',
		'entity_id',
		'entity_type'
	];

	/** @var array */
	private $_entity = [];

	/** @var array|null */
	private $_linked_company = NULL;

	/** @var array */
	private $_current = [];

	/** @var array */
	private $_contacts = NULL;

	/** @var array */
	private $_params = [];

	/** @var string */
	private $_find_pattern = '/[a-zA-zа-яА-ЯёЁ]/i';

	private $_needed_companies_numbers = FALSE;

	private $_new_variables = NULL;

	/** @var string */
	private $_replace_pattern = '/[^0-9*]/i';

	/** @var array
	 *
	 * Структура:
	 *        self::AMO_CONTACTS_TYPE => [
	 *            'cf_id' => 12345,
	 *            'phones' => [
	 *                тип_главной_сущности => [ //для кейса со списком контактов/компаний, соответственно на этом уровне максимум 2 значения
	 *                    id_главной_сущности => [ //для отправки из списков - сущностей может быть много
	 *                        номер_телефона => id_контакта, к которому привязан телефон
	 *                    ]
	 *                ],
	 *            ]
	 *        ]
	 */
	private $_phone_field = [
		self::AMO_COMPANIES_TYPE => [
			'cf_id' => FALSE,
			'phone' => [],
		],
		self::AMO_CONTACTS_TYPE => [
			'cf_id' => FALSE,
			'phone' => [],
		],
	];

	/** @var string */
	private $_message = '';

	/** @var int|null */
	private $_time = NULL;

	/** @var int|null */
	private $_translit = 0;


	/** @var array */
	private $_errors_cods = [
		1 => 'Ошибка в параметрах',
		2 => 'Неверный логин или пароль',
		3 => 'Недостаточно средств на счете Клиента',
		4 => 'IP-адрес временно заблокирован из-за частых ошибок в запросах',
		5 => 'Неверный формат даты',
		6 => 'Сообщение запрещено (по тексту или по имени отправителя)',
		7 => 'Неверный формат номера телефона',
		8 => 'Сообщение на указанный номер не может быть доставлено',
		9 => 'Отправка более одного одинакового запроса на передачу SMS-сообщения либо более пяти одинаковых запросов на получение стоимости сообщения в течение минуты',
		self::CONTACT_NOT_FOUND => 'Нет прикрепленных контактов',
		self::PHONES_NOT_FOUND => 'Не найдены номера телефона, либо они не валидны',
		self::EMPTY_MESSAGE => 'Пустой текст сообщения',
		//Ошибки для возврата на фронт
		self::EMPTY_ENTITY_ID => 'Пустой id элемента',
		self::EMPTY_ENTITY_TYPE => 'Не передан тип элемента',
		self::EMPTY_ENTITY_DATA => 'Не передан элемент',
	];

	protected function endpoint_smsc_send_sms_to_selected_contact() {
		foreach (['phone', 'message', 'contact_id'] as $key) {
			$this->_params[$key] = $this->check_request($key);
		}

		$account = $this->account->current();

		$sms = [
			'login'    => $account['widget']['login'],
			'psw'      => $account['widget']['password'],
			'fmt'      => 3,
			'translit' => 0,
			'charset'  => 'utf-8',
			'pp'       => 332142,
			'phones'   => $this->_params['phone'],
			'mes'      => $this->_params['message'],
		];

		$response = $this->smscru_api_send($sms);
		$response = json_decode($response, TRUE);

		$status = 'ok';

		if (!empty($response['error_code'])) {
			$notes['add'] = [
				[
					'element_id' => $this->_params['contact_id'],
					'element_type' => self::AMO_CONTACTS_TYPE,
					'note_type' => 4,
					'text' => 'Возникла ошибка при отправке сообщения ("' . $this->_params['message'] . '"): ' . $this->_errors_cods[$response['error_code']],
					'created_user_id' => self::AMO_USER_ROBOT,
				]
			];

			$this->notes->set($notes);

			$status = 'fail';
		}

		if (!headers_sent()) {
			header('Content-type: application/json; charset="UTF-8"');
		}

		die(json_encode(['status' => $status, 'smsc_response' => $response]));
	}

	protected function endpoint_smsc_send_sms() {
		foreach (['login', 'psw', 'from', 'time', 'translit', 'text', 'entity'] as $key) {
			$this->_params[$key] = $this->check_request($key);
		}
		$entity_count = 0; //небольшой костыль - максимум 100 номеров => в запросе должно быть не более 100 основных сущностей
		$response = [
			'error' => [],
			'status' => FALSE
		];
		//обработка обязательных параметров
		if (empty($this->_params['text'])) {
			$response['error'][] = $this->_errors_cods[self::EMPTY_MESSAGE];
		} else {
			$this->_message = $this->_params['text'];
		}

		$phones = [];
		if (empty($this->_params['entity']) || !is_array($this->_params['entity'])) {
			$response['error'][] = $this->_errors_cods[self::EMPTY_ENTITY_DATA];
		} else {
			foreach ($this->_params['entity'] as $data) {
				if (empty($data['numeric_type']) ||
					!in_array($data['numeric_type'],
						[self::AMO_CONTACTS_TYPE, self::AMO_LEADS_TYPE, self::AMO_COMPANIES_TYPE, self::AMO_CUSTOMERS_TYPE]
					)

				) {
					$response['error'][] = $this->_errors_cods[self::EMPTY_ENTITY_TYPE];
					break;
				}

				if (empty($data['id'])) {
					$response['error'][] = $this->_errors_cods[self::EMPTY_ENTITY_ID];
					break;
				}

				if (empty($data['to']) || !is_array($data['to'])) {
					$response['error'][] = $this->_errors_cods[self::PHONES_NOT_FOUND];
					break;
				}
				$data['to'] = array_unique($data['to']);
				foreach ($data['id'] as $id) {
					$entity_data = [
						'numeric_type' => (int)$data['numeric_type'],
						'type' => $this->_entity_types[(int)$data['numeric_type']],
						'id' => (int)$id,
						'phones' => $data['to']
					];
					$phones[$entity_data['numeric_type']][$entity_data['id']] = $data['to'];
					$this->_entity[$entity_data['numeric_type']][$entity_data['id']] = $entity_data;
				}
			}
		}
		foreach ($this->_entity as $entities) {
			$entity_count += count($entities);
		}

		if ($entity_count >= 100) {
			$response['error'][] = $this->_errors_cods[207];
		}
//Возвращаем ошибки, в случае, если они есть и оставнавливаем работу бека
		if (!empty($response['error'])) {
			echo json_encode($response);
			return;
		}

		$this->_translit = $this->_params['translit'];
//		$this->_login = $this->_params['login'];
//		$this->_password = $this->_params['psw'];
//		$this->_from = $this->_params['from'];

		$this->amo_api = new amoapi(
			AMO_PROTOCOL, \Helpers\Route::get('account'), AMO_DOMAIN, [
				'USER_LOGIN' => Helpers\Route::param('amouser'),
				'USER_HASH' => Helpers\Route::param('amohash'),
			]
		);

		$this->_current = $this->_objects['account']->current();
		$this->_from = $this->_params['from'];
		if ($this->_params['time'] >= time()) {
			$this->_time = $this->_params['time'];
		}

		$contacts_cf = $this->_current['custom_fields']['contacts'];
//id поля телефона
		foreach ($contacts_cf as $field) {
			if (isset($field['code']) && $field['code'] === 'PHONE') {
				$this->_phone_field[self::AMO_CONTACTS_TYPE]['cf_id'] = (int)$field['id'];
				break;
			}
		}

		$companies_cf = $this->_current['custom_fields']['companies'];
//id поля телефона
		foreach ($companies_cf as $field) {
			if (isset($field['code']) && $field['code'] === 'PHONE') {
				$this->_phone_field[self::AMO_COMPANIES_TYPE]['cf_id'] = (int)$field['id'];
				break;
			}
		}
		$filter = [];
		foreach ($this->_entity as $entity_type => $entities) {
			foreach ($entities as $entity) {
				if ($entity_type === self::AMO_CUSTOMERS_TYPE) {
					$filter[$entity_type]['filter']['id'][] = $entity['id'];
				} else {
					$filter[$entity_type]['id'][] = $entity['id'];
				}
			}
		}

		$entity_data = [];
		foreach ($filter as $entity_type => $entity_filter) {
			switch ($entity_type) {
				case self::AMO_COMPANIES_TYPE:
					$this->_needed_companies_numbers = TRUE; //только в этом случае нам нужны номера из компаний
					$entity_data[$entity_type] = $this->_objects['company']->get($entity_filter);
					break;
				case self::AMO_CONTACTS_TYPE:
					$entity_data[$entity_type] = $this->_objects['contacts']->get($entity_filter);
					break;
				case self::AMO_LEADS_TYPE:
					$entity_data[$entity_type] = $this->_objects['leads']->get($entity_filter);
					break;
				case self::AMO_CUSTOMERS_TYPE:
					$entity_data[$entity_type] = $this->amo_api->send_api_request(
						$this->_entity_types[self::AMO_CUSTOMERS_TYPE],
						$entity_filter
					);
					break;
			}
		}
		$modified_message = [];

		foreach ($this->_entity as $entity_type => &$entities) {
			foreach ($entities as &$entity) {
				foreach ($entity_data[$entity_type] as $entity_from_api) {
					if ($entity['id'] !== (int)$entity_from_api['id']) {
						continue;
					}
					$entity['data'] = $entity_from_api;
					//Пытаемся заменить только, если в тексте есть что-то похожее на старый маркер
					if (preg_match('/{.*}/i', $this->_params['text']) !== 0 &&
						preg_match('/{.*}/i', $this->_params['text']) !== FALSE) {
						$modified_message[$entity_type][$entity['id']] = $this->find_and_replace_old_markers(
							$entity['data'],
							$this->_entity_types[$entity_type],
							$this->_params['text']
						);
					} else {
						$modified_message[$entity_type][$entity['id']] = $this->_params['text'];
					}
				}
			}
			unset($entity);
		}
		unset($entities);
		unset($filter);

		$this->_contacts = $this->find_contacts();

		$this->filter_contacts_by_phone($phones);
		$response['phones'] = $phones;
		$mes = [];
		$parametrs = [];
		$i = 0;
		$messages = [];
		foreach ($modified_message as $entity_type => $entities) {
			foreach ($entities as $entity_id => $entity_message) {
				$entity_message = str_replace("\n", '\n', $entity_message);
				// $entity_message = '';
				// foreach ($text as $words)
				// 	$entity_message .= $words;

				//Пытаемся заменить только, если в тексте есть что-то похожее на новый маркер маркер
				if (preg_match('/{{.*}}/i', $this->_params['text']) !== 0 &&
					preg_match('/{{.*}}/i', $this->_params['text']) !== FALSE) {
					$messages[$entity_type][$entity_id] = $this->find_and_replace_new_markers($entity_message, $entity_type, $entity_id);
					$mes[$i]['message'] = $this->find_and_replace_new_markers1($entity_message, $entity_type, $entity_id);

//					$parametrs[$i]['entity'] = $this->find_and_replace_new_markers1($entity_message, $entity_type, $entity_id);
//					$parametrs[$i]['entity_message'] = $entity_message;
//					$parametrs[$i]['entity_type'] = $entity_type;
//					$parametrs[$i]['entity_id'] = $entity_id;
					$mes[$i]['id'] = $entity_id;
				} else {
					$linked_entities = $entity_type === self::AMO_COMPANIES_TYPE ?
						$this->_linked_company[$entity_type][$entity_id] : $this->_contacts[$entity_type][$entity_id];
					foreach ($linked_entities as $linked_entity) {
						$messages[$entity_type][$entity_id][$linked_entity['id']] = $entity_message;
						$mes[$i]['message'] = $entity_message;
						$mes[$i]['id'] = $entity_id;
					}
				}
				$i++;
			}
			$i = 0;
		}
//		$this->prepare_and_send_sms($messages, FALSE);
		$response['status'] = TRUE;
		$response['message'] = $mes;
//		$response['message'] = $parametrs;

		echo json_encode($response);
	}

//	protected function endpoint_smsc_send_sms() {
//		foreach (['entity_id', 'entity_type', 'text'] as $key) {
//			$this->_params[$key] = $this->check_request($key);
//		}
//		$entity_count = 0; //небольшой костыль - максимум 100 номеров => в запросе должно быть не более 100 основных сущностей
//		$response = [
//			'error' => [],
//			'status' => FALSE
//		];
//		//обработка обязательных параметров
//		if (empty($this->_params['api_id'])) {
//			$response['error'][] = $this->_errors_cods[self::API_KEY_NOT_FOUND];
//		}
//
//		if (empty($this->_params['text'])) {
//			$response['error'][] = $this->_errors_cods[self::EMPTY_MESSAGE];
//		} else {
//			$this->_message = $this->_params['text'];
//		}
//
//		$phones = [];
//		if (empty($this->_params['entity']) || !is_array($this->_params['entity'])) {
//			$response['error'][] = $this->_errors_cods[self::EMPTY_ENTITY_DATA];
//		} else {
//			foreach ($this->_params['entity'] as $data) {
//
//				$data['to'] = array_unique($data['to']);
//				$entity_data = [
//					'numeric_type' => (int)$data['numeric_type'],
//					'type' => $this->_entity_types[(int)$data['numeric_type']],
//					'id' => (int)$data['id'],
//					'phones' => $data['to']
//				];
//				$phones[$entity_data['numeric_type']][$entity_data['id']] = $data['to'];
//				$this->_entity[$entity_data['numeric_type']][$entity_data['id']] = $entity_data;
//			}
//
//			foreach ($this->_entity as $entities) {
//				$entity_count += count($entities);
//			}
//			if ($entity_count >= 100) {
//				$response['error'][] = $this->_errors_cods[207];
//			}
//			//Возвращаем ошибки, в случае, если они есть и оставнавливаем работу бека
//			if (!empty($response['error'])) {
//				echo json_encode($response);
//				return;
//			}
//
//			$this->_translit = $this->_params['translit'];
//
//
//			$this->_current = $this->_objects['account']->current();
//			$this->_from = $this->_params['from'];
//			if ($this->_params['time'] >= time()) {
//				$this->_time = $this->_params['time'];
//			}
//
//			$contacts_cf = $this->_current['custom_fields']['contacts'];
//			//id поля телефона
//			foreach ($contacts_cf as $field) {
//				if (isset($field['code']) && $field['code'] === 'PHONE') {
//					$this->_phone_field[self::AMO_CONTACTS_TYPE]['cf_id'] = (int)$field['id'];
//					break;
//				}
//			}
//
//			$companies_cf = $this->_current['custom_fields']['companies'];
//			//id поля телефона
//			foreach ($companies_cf as $field) {
//				if (isset($field['code']) && $field['code'] === 'PHONE') {
//					$this->_phone_field[self::AMO_COMPANIES_TYPE]['cf_id'] = (int)$field['id'];
//					break;
//				}
//			}
//			$filter = [];
//			foreach ($this->_entity as $entity_type => $entities) {
//				foreach ($entities as $entity) {
//					if ($entity_type === self::AMO_CUSTOMERS_TYPE) {
//						$filter[$entity_type]['filter']['id'][] = $entity['id'];
//					} else {
//						$filter[$entity_type]['id'][] = $entity['id'];
//					}
//				}
//			}
//
//			$entity_data = [];
//			foreach ($filter as $entity_type => $entity_filter) {
//				switch ($entity_type) {
//					case self::AMO_COMPANIES_TYPE:
//						$this->_needed_companies_numbers = TRUE; //только в этом случае нам нужны номера из компаний
//						$entity_data[$entity_type] = $this->_objects['company']->get($entity_filter);
//						break;
//					case self::AMO_CONTACTS_TYPE:
//						$entity_data[$entity_type] = $this->_objects['contacts']->get($entity_filter);
//						break;
//					case self::AMO_LEADS_TYPE:
//						$entity_data[$entity_type] = $this->_objects['leads']->get($entity_filter);
//						break;
//					case self::AMO_CUSTOMERS_TYPE:
//						$entity_data[$entity_type] = $this->amo_api->send_api_request(
//							$this->_entity_types[self::AMO_CUSTOMERS_TYPE],
//							$entity_filter
//						);
//						break;
//				}
//			}
//			$modified_message = [];
//
//			foreach ($this->_entity as $entity_type => &$entities) {
//				foreach ($entities as &$entity) {
//					foreach ($entity_data[$entity_type] as $entity_from_api) {
//						if ($entity['id'] !== (int)$entity_from_api['id']) {
//							continue;
//						}
//						$entity['data'] = $entity_from_api;
//						//Пытаемся заменить только, если в тексте есть что-то похожее на старый маркер
//						if (preg_match('/{.*}/i', $this->_params['text']) !== 0 &&
//							preg_match('/{.*}/i', $this->_params['text']) !== FALSE) {
//							$modified_message[$entity_type][$entity['id']] = $this->find_and_replace_old_markers(
//								$entity['data'],
//								$this->_entity_types[$entity_type],
//								$this->_params['text']
//							);
//						} else {
//							$modified_message[$entity_type][$entity['id']] = $this->_params['text'];
//						}
//					}
//				}
//				unset($entity);
//			}
//			unset($entities);
//			unset($filter);
//
//			$this->_contacts = $this->find_contacts();
//			$this->filter_contacts_by_phone($phones);
//
//			$messages = [];
//			foreach ($modified_message as $entity_type => $entities) {
//				foreach ($entities as $entity_id => $entity_message) {
//					//Пытаемся заменить только, если в тексте есть что-то похожее на новый маркер маркер
//					if (preg_match('/{{.*}}/i', $this->_params['text']) !== 0 &&
//						preg_match('/{{.*}}/i', $this->_params['text']) !== FALSE) {
//						$messages[$entity_type][$entity_id] = $this->find_and_replace_new_markers($entity_message, $entity_type, $entity_id);
//					} else {
//						$linked_entities = $entity_type === self::AMO_COMPANIES_TYPE ?
//							$this->_linked_company[$entity_type][$entity_id] : $this->_contacts[$entity_type][$entity_id];
//						foreach ($linked_entities as $linked_entity) {
//							$messages[$entity_type][$entity_id][$linked_entity['id']] = $entity_message;
//						}
//					}
//				}
//			}
//			$response['status'] = TRUE;
//
//			echo json_encode($response);
//		}
//	}

	protected
	function endpoint_digital_pipeline() {
		foreach ($this->keys as $key) {
			$this->_params[$key] = $this->check_request($key);
		}

		//Проверка на корректность входных данных
		if (empty($this->_params['action']['settings']['widget']['settings'])) {
			throw new \Exception('Empty widget settings');
		}
		$this->_params['settings'] = $this->_params['action']['settings']['widget']['settings'];

		if (empty($this->_params['event']['data']['element_type'])) {
			throw new \Exception('Unsupported type');
		}
		$entity_type = $this->_params['event']['data']['element_type'];

		if (empty($this->_entity_types[$entity_type])) {
			throw new \Exception('Unsupported type');
		}
		if (empty($this->_params['settings']['message'])) {
			$this->entity_notes_set(
				$this->_params['event']['data']['id'],
				$this->_params['event']['data']['element_type'],
				$this->_params['settings']['message'],
				self::EMPTY_MESSAGE
			);

			throw new \Exception('Empty message');
		}

//		$url = 'http://requestbin.fullcontact.com/11wja791';
//		$sms = ['5' => count(explode('~~~~~', $this->_params['settings']['message']))];
//		$ch = curl_init($url);
//		curl_setopt($ch, CURLOPT_POST, 1);
//		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
//		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 60);
//		curl_setopt($ch, CURLOPT_TIMEOUT, 60);
//		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
//		curl_setopt($ch, CURLOPT_POSTFIELDS, $sms);
//		$response = curl_exec($ch);
//		curl_close($ch);
//		die();
		if (count(explode('~~~~~', $this->_params['settings']['message'])) == 1)
			$this->_params['settings']['message'] .= '~~~~~---';

		list($this->_message, $this->_from) = explode('~~~~~', $this->_params['settings']['message']);

		if ($this->_from == '---')
			$this->_from = '';

		//Сохранение всех нужных данных в свойства
		unset($this->_params['action']['settings']);

		$this->_current = $this->account->current();

		if (empty($this->_current['custom_fields']['contacts'])) {
			$this->entity_notes_set(
				$this->_params['event']['data']['id'],
				$this->_params['event']['data']['element_type'],
				$this->_message,
				self::PHONES_NOT_FOUND
			);

			throw new \Exception('Custom fields not found');
		}
		$cf = $this->_current['custom_fields']['contacts'];

		$main_entity_id = $this->_params['event']['data']['id'];
		$entity_data[(int)$entity_type][$main_entity_id] = [
			'numeric_type' => (int)$entity_type,
			'type' => $this->_entity_types[(int)$entity_type],
			'id' => $main_entity_id,
		];
		$this->_entity = $entity_data;
		//Клиентские логин и пароль в smsc.ru
		$this->_login = $this->_current['widget']['login'];
		$this->_password = $this->_current['widget']['password'];
		//id поля телефона
		foreach ($cf as $field) {
			if (isset($field['code']) && $field['code'] === 'PHONE') {
				$this->_phone_field[self::AMO_CONTACTS_TYPE]['cf_id'] = (int)$field['id'];
				break;
			}
		}
		$this->amo_api = new amoapi(
			AMO_PROTOCOL, \Helpers\Route::get('account'), AMO_DOMAIN, [
				'USER_LOGIN' => \Helpers\Route::param('amouser'),
				'USER_HASH' => \Helpers\Route::param('amohash'),
			]
		);

		$filter = [];
		if ($this->_entity[$entity_type][$main_entity_id]['numeric_type'] === self::AMO_CUSTOMERS_TYPE) {
			$filter = [
				'filter' => [
					'id' => $main_entity_id,
				],
			];
		} elseif ($this->_entity[$entity_type][$main_entity_id]['numeric_type'] === self::AMO_LEADS_TYPE) {
			$filter = [
				'id' => $main_entity_id,
			];
		}
		$this->_entity[$entity_type][$main_entity_id]['data'] = $this->amo_api->send_api_request(
			$this->_entity[$entity_type][$main_entity_id]['type'],
			$filter
		);

		$this->_entity[$entity_type][$main_entity_id]['data'] = reset($this->_entity[$entity_type][$main_entity_id]['data']);
		unset($filter);

		$this->_contacts = $this->find_contacts();

		//Добавляем заметку об отсутствии контактов
		if (empty($this->_contacts)) {
			$this->entity_notes_set(
				$main_entity_id,
				$this->_params['event']['data']['element_type'],
				$this->_message,
				self::CONTACT_NOT_FOUND
			);
		} else {
			$this->_phone_field = $this->find_numbers($this->_contacts, self::AMO_CONTACTS_TYPE);
			if (!empty($this->_phone_field[self::AMO_CONTACTS_TYPE]['phone'])) {
				//замена только по текущей сущности - связанные не нужны
				$id = $main_entity_id;
				$modified_message[$entity_type][$id] = $this->find_and_replace_old_markers(
					$this->_entity[$entity_type][$main_entity_id]['data'],
					$this->_entity[$entity_type][$main_entity_id]['type'],
					$this->_message
				);
				foreach ($modified_message as $entity_type => $entities) {
					foreach ($entities as $entity_id => $entity_message) {
						$messages[$entity_type][$entity_id] = $this->find_and_replace_new_markers($entity_message, $entity_type, $entity_id);
					}
				}
				$this->prepare_and_send_sms($messages, TRUE);
			} else {
				//Заметка о том, что в контактах не было найдено номера телефона
				$this->entity_notes_set(
					$main_entity_id,
					$this->_params['event']['data']['element_type'],
					$this->_message,
					self::PHONES_NOT_FOUND
				);
			}
		}
	}

	/***********/
	/* Methods */
	/***********/
	/**
	 * Получение данных от хука ДП
	 *
	 * @param $key
	 *
	 * @return array|null
	 */
	private
	function check_request($key) {
		return Helpers\Route::param($key) ? Helpers\Route::param($key) : NULL;
	}

	private
	function filter_contacts_by_phone(array $phones) {
		if ($this->_needed_companies_numbers) {
			$this->_linked_company = $this->find_linked_company();
			$types = [self::AMO_COMPANIES_TYPE, self::AMO_CONTACTS_TYPE];
		} else {
			$types = [self::AMO_CONTACTS_TYPE];
		}
		$needle_entities_ids = [];
		foreach ($types as $type) {
			$linked_entity = $type === self::AMO_CONTACTS_TYPE ? $this->_contacts : $this->_linked_company;
			$this->find_numbers($linked_entity, $type);
			foreach ($this->_phone_field[$type]['phone'] as $entity_type => $main_element_contacts) {
				foreach ($main_element_contacts as $main_element_id => $phones_list) {
					foreach ($phones_list as $number => $linked_entity_id) {
						if (!in_array($number, $phones[$entity_type][$main_element_id])) {
							unset($this->_phone_field[$type]['phone'][$entity_type][$main_element_id][$number]);
						} else {
							$needle_entities_ids[] = $linked_entity_id;
							$indexses = array_flip($phones[$entity_type][$main_element_id]);
							if (isset($indexses[$number])) {
								unset($phones[$entity_type][$main_element_id][$indexses[$number]]);
							}
						}
					}

					//у одного контакта может быть несколько номеров телефонов
					$needle_entities_ids = array_unique($needle_entities_ids);
					$all_linked_entities_ids = array_keys($this->_contacts[$entity_type][$main_element_id]);
					$contacts_to_unset = array_diff($all_linked_entities_ids, $needle_entities_ids);

					foreach ($contacts_to_unset as $linked_entity_id) {
						unset($this->_contacts[$linked_entity_id]);
					}
				}
			}
		}
		//сохраним номера, не привязанные к карточке контакта.
		foreach ($phones as $entity_type => $entities_phones) {
			$e_t = $entity_type;
			foreach ($entities_phones as $main_element_id => $phones_list) {
				if (!empty($phones_list) && (int)$e_t != 1) {
					$this->_contacts[$entity_type][$main_element_id][self::AMO_CONTACT_ID_STUB] = [
						'id' => self::AMO_CONTACT_ID_STUB,
					];
					foreach ($phones_list as $number) {
						$this->_phone_field[self::AMO_CONTACTS_TYPE]['phone'][$entity_type][$main_element_id][$number] = self::AMO_CONTACT_ID_STUB;
					}
				}
			}
		}
	}

	/**
	 * @param array $entity
	 * @param int $entity_type
	 *
	 * @return array
	 */
	private
	function find_numbers(array $entity, $entity_type) {
		foreach ($entity as $main_entity_type => $enities) {
			foreach ($enities as $main_element_id => $entity_item) {
				foreach ($entity_item as $id => $entity_data) {

					if (empty($entity_data['custom_fields'])) {
						continue;
					}
					foreach ($entity_data['custom_fields'] as $cf) {
						if ((int)$cf['id'] !== (int)$this->_phone_field[$entity_type]['cf_id']) {
							continue;
						}

						foreach ($cf['values'] as $cf_value) {
							if (!preg_match($this->_find_pattern, $cf_value['value'])) {
								$number = preg_replace(
									$this->_replace_pattern,
									'',
									$cf_value['value']
								);
								//$number - максимум 100 штук
								$this->_phone_field[$entity_type]['phone'][$main_entity_type][$main_element_id][$number] = $id;
							}
						}
						break;
					}
				}
			}
		}

		return $this->_phone_field;
	}

	/**
	 * Костыль чтобы обрабатывать шаблоны, используемые на фронте виджета
	 * Шаблоны обрабатывают переменные только основной сущности (игнорирую связанные)
	 * Для сохранения обратной совместимости, логика шаблонов аналогична логике фронта
	 *
	 * @param array $data
	 * @param string $entity_type
	 * @param string $message
	 *
	 * @return string
	 */
	private
	function find_and_replace_old_markers($data, $entity_type, $message) {
		$cf = $this->find_cf_id_by_entity_type($entity_type);
		$message = preg_replace(self::NAME_PATTERN, $data['name'], $message);
		$responsible_user_id = $entity_type === 'customers' ? (int)$data['main_user_id'] : (int)$data['responsible_user_id'];
		foreach ($this->_current['users'] as $user) {
			$user['id'] = (int)$user['id'];
			if ($responsible_user_id !== $user['id']) {
				continue;
			}
			$user['name'] = !empty($user['name']) ? $user['name'] : "";
			$user['phone_number'] = !empty($user['phone_number']) ? $user['phone_number'] : "";
			$user['login'] = !empty($user['login']) ? $user['login'] : "";
			$message = preg_replace(self::RESPONSIBLE_USER_PATTERN, $user['name'], $message);
			$message = preg_replace(self::RESPONSIBLE_USER_PHONE_PATTERN, $user['phone_number'], $message);
			$message = preg_replace(self::RESPONSIBLE_USER_EMAIL_PATTERN, $user['login'], $message);
		}

		foreach ($cf as $regexp => $field) {
			$value = NULL;
			if (!empty($data['custom_fields'])) {
				foreach ($data['custom_fields'] as $entity_field) {
					if ($entity_field['id'] !== $field['id']) {
						continue;
					}
					foreach ($entity_field['values'] as $field_values) {
						$cf_value = $field_values['value'];
						if ($field['is_date']) {
							if (!empty($cf_value)) {
								$timestamp = strtotime($cf_value);
								$datatime = new \DateTime();
								$datatime->setTimestamp((int)$timestamp);
								$cf_value = $datatime->format($this->_current['date_format']);
							}
						}
						$value[] = $cf_value;
					}
					$value = implode(',', $value);
					break;
				}
			}
			$value = !is_null($value) ? $value : "";
			$message = preg_replace($regexp, $value, $message);

		}

		return $message;
	}

	/**
	 * Возвращает массив
	 * ключ - регулярное выражение для поиска кастомного поиска кастомного поля в строке по названию
	 * значение - id кастомного поля
	 *
	 * @param string $entity_type
	 * @return array
	 */
	private
	function find_cf_id_by_entity_type($entity_type) {
		$fields = [];
		$cfs = $this->_current['custom_fields'][$entity_type];
		foreach ($cfs as $field) {
			$is_date = FALSE;
			$field['type_id'] = (int)$field['type_id'];
			if (!empty($field['type_id']) && ($field['type_id'] === self::CF_DATE_TYPE || $field['type_id'] === self::CF_BIRTHDAY_TYPE)) {
				$is_date = TRUE;
			}
			$fields['/{(' . preg_quote($field['name'], '/') . ')}/i'] = [
				'id' => $field['id'],
				'is_date' => $is_date,
			];
		}

		return $fields;
	}

	/**
	 * Работа с новыми маркерами ДП
	 * Маркеры контактов обрабатываются в последнюю очередь
	 *
	 * @param string $original_text
	 * @param int $entity_type
	 * @param int $entity_id
	 *
	 * @return array
	 */
	private
	function find_and_replace_new_markers($original_text, $entity_type, $entity_id) {
		$message = [];

		$variables = $this->extract_variables($original_text);
		foreach (['leads', 'customers', 'companies', 'contacts'] as $key) {
			$name_marker = '';
			switch ($key) {
				case 'leads':
					$entity = $this->get_lead_or_customer($entity_type, $entity_id, self::AMO_LEADS_TYPE);
					$name_marker = '{{lead_name}}';
					break;
				case 'customers':
					$entity = $this->get_lead_or_customer($entity_type, $entity_id, self::AMO_CUSTOMERS_TYPE);
					$name_marker = '{{customer_name}}';
					break;
				case 'companies':
					$companies = $this->find_linked_company();
					$entity = !empty($companies[$entity_type][$entity_id]) ? $companies[$entity_type][$entity_id] : [];
					$name_marker = '{{company_name}}';
					break;
				case 'contacts':
					if ($entity_type !== self::AMO_COMPANIES_TYPE) {
						$entity = $this->_contacts[$entity_type][$entity_id];
					} else {
						$entity = [];
					}
					$name_marker = '{{contact_name}}';
					break;
			}
			//заменяем основные маркеры
			$linked_entities = $entity_type === self::AMO_COMPANIES_TYPE ?
				$this->_linked_company[$entity_type][$entity_id] : $this->_contacts[$entity_type][$entity_id];
			foreach ($linked_entities as $linked_entity) {
				if (empty($message[$linked_entity['id']])) {
					$message[$linked_entity['id']] = $original_text;
				}
				$current_entity = !empty($entity) ? $entity : [];
				if (!empty($current_entity) &&
					(
						$key === $this->_entity_types[self::AMO_CONTACTS_TYPE] ||
						$entity_type === self::AMO_COMPANIES_TYPE && $key === $this->_entity_types[self::AMO_COMPANIES_TYPE]
					)
				) {
					$current_entity = $current_entity[$linked_entity['id']];
				}
				if (!empty($variables[$key])) {
					$message[$linked_entity['id']] = $this->replace_variables(
						$current_entity,
						$variables[$key],
						$key,
						$entity_type,
						$entity_id,
						$message[$linked_entity['id']],
						$linked_entity
					);
				}

				//заменяем маркеры имени
				if (strpos($this->_message, $name_marker) !== FALSE) {
					$entity_name = !empty($current_entity['name']) ?
						$current_entity['name'] : '';
					$message[$linked_entity['id']] = str_replace(
						$name_marker,
						$entity_name,
						$message[$linked_entity['id']]
					);
				}
			}
		}

		return $message;
	}

	private
	function find_and_replace_new_markers1($original_text, $entity_type, $entity_id) {
		$message = [];
		$mes = '';
		$i = 0;

		$variables = $this->extract_variables($original_text);
//		return $variables;
		foreach (['leads', 'customers', 'companies', 'contacts'] as $key) {
			$name_marker = '';
			switch ($key) {
				case 'leads':
					$entity = $this->get_lead_or_customer($entity_type, $entity_id, self::AMO_LEADS_TYPE);
					$name_marker = '{{lead_name}}';
					break;
				case 'customers':
					$entity = $this->get_lead_or_customer($entity_type, $entity_id, self::AMO_CUSTOMERS_TYPE);
					$name_marker = '{{customer_name}}';
					break;
				case 'companies':
					$companies = $this->find_linked_company();
					$entity = !empty($companies[$entity_type][$entity_id]) ? $companies[$entity_type][$entity_id] : [];
					$name_marker = '{{company_name}}';
					break;
				case 'contacts':
					if ($entity_type !== self::AMO_COMPANIES_TYPE) {
						$entity = $this->_contacts[$entity_type][$entity_id];
//						return $entity;
//						$i = 1;
					} else {
						$entity = [];
//						return 2;
//						$i = 2;
					}
					$name_marker = '{{contact_name}}';
					break;
			}
//			$i++;
//			return $entity;
			//заменяем основные маркеры
			$linked_entities = $entity_type === self::AMO_COMPANIES_TYPE ?
				$this->_linked_company[$entity_type][$entity_id] : $this->_contacts[$entity_type][$entity_id];
//			if($i == 4) return $entity;
//			$returner[$i] = $linked_entities;
//			return $this->_contacts[$entity_type][$entity_id];
			foreach ($linked_entities as $linked_entity) {
				if (empty($message[$linked_entity['id']])) {
					$message[$linked_entity['id']] = $original_text;
//					$message[$linked_entity['id']] = '1';
				}
				$current_entity = !empty($entity) ? $entity : [];
//				return $current_entity;
				if (!empty($current_entity) &&
					(
						$key === $this->_entity_types[self::AMO_CONTACTS_TYPE] ||
						$entity_type === self::AMO_COMPANIES_TYPE && $key === $this->_entity_types[self::AMO_COMPANIES_TYPE]
					)
				) {
					$current_entity = $current_entity[$linked_entity['id']];
				}
				if (!empty($variables[$key])) {
					$message[$linked_entity['id']] = $this->replace_variables(
						$current_entity,
						$variables[$key],
						$key,
						$entity_type,
						$entity_id,
						$message[$linked_entity['id']],
						$linked_entity
					);
//					$message[$linked_entity['id']] = [$current_entity, $variables[$key], $key, $entity_type, $entity_id, $message[$linked_entity['id']]];
				}

				//заменяем маркеры имени
				if (strpos($this->_message, $name_marker) !== FALSE) {
					$entity_name = !empty($current_entity['name']) ?
						$current_entity['name'] : '';
					$message[$linked_entity['id']] = str_replace(
						$name_marker,
						$entity_name,
						$message[$linked_entity['id']]
					);
//					$message[$linked_entity['id']] = '3';
//					$i = $entity_name;
				}
//				$i++;
			}
			$mes = $message[$linked_entity['id']];
//			$mes = 'testtest';
//			$mes .= $message[$linked_entity['id']]
//;
//			$mes .= ' ';
//			$mes .= $entity_id;
//			$mes .= ' ';
		}

		return $mes;
//		return $this->_contacts;
//		return $i;
//		return 1;
	}

	/**
	 * @param array $entity
	 * @param array $variables
	 * @param string $current_entity_type
	 * @param int $main_entity_numeric_type
	 * @param int $entity_id
	 * @param string $message
	 * @param array $linked_entity
	 *
	 * @return string
	 */
	private
	function replace_variables(
		array $entity,
		array $variables,
		$current_entity_type,
		$main_entity_numeric_type,
		$entity_id,
		$message,
		$linked_entity
	) {
		$user = [];
		//Если сущность с id контакта-заглушки, не нужно пытаться её заменить
		if (!empty($entity['id']) && $entity['id'] === self::AMO_CONTACT_ID_STUB) {
			unset($entity);
		}
		//компании может и не быть, тогда нам просто нужно заменить переменные на пустоту
		if (!empty($entity)) {
			//У покупателей - мейн юзер айди
			$responsible_user_id = isset($entity['responsible_user_id']) ? (int)$entity['responsible_user_id'] : (int)$entity['main_user_id'];
			foreach ($this->_current['users'] as $user_item) {
				$user_item['id'] = (int)$user_item['id'];
				if ($user_item['id'] === $responsible_user_id) {
					$user = $user_item;
					break;
				}
			}
		}
		foreach ($variables as $entity_variable) {
			$short_link_value = $value = NULL;
			//если в сделке используется макрос компании - не пытаемся его найти, просто заменяем на пустоту
			if (!(in_array($current_entity_type, ['customers', 'leads']) &&
					$current_entity_type !== $this->_entity[$main_entity_numeric_type][$entity_id]['type'])
				&& !empty($entity)) {
				switch ($entity_variable) {
					case 'responsible_user':
						$value = !empty($user['name']) ? $user['name'] : '';
						break;
					case 'responsible_user_phone':
						$value = !empty($user['phone_number']) ? $user['phone_number'] : '';
						break;
					case 'responsible_user_email':
						$value = !empty($user['login']) ? $user['login'] : '';
						break;
					case (preg_match('/(cf)\.([0-9])+/i', $entity_variable) ? TRUE : FALSE):
						$cf = explode('.', $entity_variable);
						$cf_id = (int)$cf[1];
						$value = $this->find_cf_value($current_entity_type, $entity, $cf_id);

						if ($url = filter_var($value, FILTER_VALIDATE_URL)) {
							$link = [
								'url' => $url,
							];

							if (isset($linked_entity['id'], $linked_entity['type']) && $linked_entity['type'] == 'contact') {
								$link['contact_id'] = $linked_entity['id'];
							}

							try {
								if ($short_links = $this->short_link->generate($this->_current['id'], [$link])) {
									$short_link = reset($short_links);

									if (!empty($short_link['base_url'])) {
										$short_link_value = $short_link['base_url'];
									}
								}
							} catch (\Exception $e) {
							}
						}
						break;
					case 'next_date':
						if (isset($entity[$entity_variable])) {
							$timestamp = $entity[$entity_variable];
							$data = new \DateTime();
							$data->setTimestamp($timestamp);
							$value = $data->format($this->_current['date_format']);
						}
						break;
					default:
						if (isset($entity[$entity_variable])) {
							$value = $entity[$entity_variable];
						}
				}
			}
			$value = !is_null($value) ? $value : '';
			$original_message = $message;

			$message = str_replace(
				'{{' . $current_entity_type . '.' . $entity_variable . '}}',
				$value,
				$original_message
			);

			if ($current_entity_type === 'leads') {
				$lead_type = 'lead'; //обратная совместимость... на всякий случай, пытаемся найти не только leads., но и lead.
				$message = str_replace(
					'{{' . $lead_type . '.' . $entity_variable . '}}',
					$value,
					$message
				);
			}

			if ($short_link_value) {
				$message = [
					'sms_text'  => str_replace(
						'{{' . $current_entity_type . '.' . $entity_variable . '}}',
						$short_link_value,
						$original_message
					),
					'note_text' => $message
				];
			}
		}

		return $message;
//		return 2;
	}

	/**
	 * Извлекает маркеры из сообзения
	 * @param string $original_text
	 *
	 * @return array
	 */
	private
	function extract_variables($original_text) {
		//на запросы с фронта функция будет вызываться в цикле, хотя состав переменных меняться не будет
		if (!is_null($this->_new_variables)) {
			return $this->_new_variables;
//			return 4;
		}
		$variables = [];
		$out = [];
		preg_match_all(self::NEW_MARKERS_PATTERN, $original_text, $out);
		if (!empty($out[0] && is_array($out[0]))) {
			foreach ($out[0] as $variable) {
				//избавляемся от лишних символов
				$variable = str_replace('{{', '', $variable);
				$variable = str_replace('}}', '', $variable);
				//работаем с переменными как с массивом: сущность => маркер
				$variable = explode('.', $variable);
				if (
					!empty($variable[0]) &&
					in_array($variable[0], ['lead', 'leads', 'customers', 'contacts', 'companies']) && //lead.id, но leads.cf...
					!empty($variable[1])
				) {
					//костыль из-за того, что в одном маркере lead, в другом leads
					$variable[0] = $variable[0] === 'lead' ? 'leads' : $variable[0];
					//Кастомные поля обрабатываются в отдельной функции
					$variable[1] = $variable[1] === 'cf' ? $variable[1] . '.' . $variable[2] : $variable[1];
					$variables[$variable[0]][] = $variable[1];
				}
			}
		}

		//удалим повторяющиеся переменные
		foreach ($variables as &$entity_variable) {
			$entity_variable = array_unique($entity_variable);
		}
		unset($entity_variable);
		$this->_new_variables = $variables;

		return $this->_new_variables;
//		return 5;
	}

	/**
	 * @param int $entity_type
	 * @param array $entity
	 * @param int $cf_id
	 *
	 * @return string|null
	 */
	private
	function find_cf_value($entity_type, array $entity, $cf_id) {
		$value = NULL;
		$cf = [];
		foreach ($this->_current['custom_fields'][$entity_type] as $entity_cf) {
			$entity_cf['id'] = (int)$entity_cf['id'];
			if ($entity_cf['id'] === $cf_id) {
				$cf = $entity_cf;
				break;
			}
		}

		if (!empty($cf) && !empty($entity['custom_fields'])) {
			foreach ($entity['custom_fields'] as $entity_cf) {
				$entity_cf['id'] = (int)$entity_cf['id'];
				if ($entity_cf['id'] === $cf_id) {
					$values = [];
					foreach ($entity_cf['values'] as $cf_value) {
						$values[] = $cf_value['value'];
					}
					$value = implode(', ', $values);

					//Если поле типа "Дата" нуно убрать оттуда время 00:00:00
					$cf['type_id'] = (int)$cf['type_id'];
					if ($cf['type_id'] === self::CF_DATE_TYPE || $cf['type_id'] === self::CF_BIRTHDAY_TYPE) {
						$timestamp = strtotime($value);
						$data = new \DateTime();
						$data->setTimestamp($timestamp);
						$value = $data->format($this->_current['date_format']);
					}
					break;
				}
			}
		}

		return $value;
	}

	/**
	 * Формирование массива для последующей отправки в апи смсцру, парсинг ответа и добавление заметки
	 *
	 * @param array $messages
	 * @param bool $automatic
	 */
	private
	function prepare_and_send_sms(array $messages, $automatic = TRUE) {
		$mes = '';
		$sms = [
			'login' => $this->_login,
			'psw' => $this->_password,
			'sender' => urlencode($this->_from),
			'fmt' => 3,
			'translit' => $this->_translit,
			'charset' => 'utf-8',
			'pp' => 332142
		];

		$sms['list'] = '';

		foreach ($messages as $entity_type => $entities) {
			foreach ($entities as $entity_id => $entity) {
				$phone_list_type = $entity_type === self::AMO_COMPANIES_TYPE ? self::AMO_COMPANIES_TYPE : self::AMO_CONTACTS_TYPE;
				foreach ($this->_phone_field[$phone_list_type]['phone'][$entity_type][$entity_id] as $number => $contact_id) {

					if (is_array($entity[$contact_id]) && isset($entity[$contact_id]['sms_text'], $entity[$contact_id]['note_text'])) {
						$sms_text = $entity[$contact_id]['sms_text'];
						$note_text = $entity[$contact_id]['note_text'];
					} else {
						$sms_text = $entity[$contact_id];
						$note_text = $entity[$contact_id];
					}

					$sms['list'] .= $number . ':' . $sms_text . "\n";
					$mes = $note_text;
				}
			}
		}

		$mes = str_replace("\n", '\n', $mes);

		$response = $this->smscru_api_send($sms);
		$response = json_decode($response, TRUE);

		if (!empty($response['error_code'])) {
			$notes['add'] = [];
			foreach ($this->_entity as $entity_type => $entities) {
				foreach ($entities as $entity) {
					$note = [
						'element_id' => $entity['id'],
						'element_type' => $entity_type,
						'note_type' => 4,
//						'text' => 'Возникла ошибка при отправке сообщения ("' . $this->_message . '"): ' . $this->_errors_cods[$response['error_code']],
						'text' => 'Возникла ошибка при отправке сообщения ("' . $mes . '"): ' . $this->_errors_cods[$response['error_code']],
						'created_user_id' => self::AMO_USER_ROBOT,
					];
					$notes['add'][] = $note;
				}
			}
			$this->notes->set($notes);
		} else {
			$notes['add'] = [];
			foreach ([self::AMO_COMPANIES_TYPE, self::AMO_CONTACTS_TYPE] as $phone_type) {
				foreach ($this->_phone_field[$phone_type]['phone'] as $main_entity_type => $entities) {
					foreach ($entities as $main_entity_id => $contacts_id) {
						//Смотреть на номера телефонов компаний нужно только отправляя сообщения компаниям
						if ($main_entity_type !== self::AMO_COMPANIES_TYPE && $phone_type === self::AMO_COMPANIES_TYPE) {
							continue;
						} elseif ($main_entity_type === self::AMO_COMPANIES_TYPE && $phone_type !== self::AMO_COMPANIES_TYPE) {
							continue;
						}

						$cnt = 0;

						foreach ($contacts_id as $number => $contact_id) {
							if (empty($response['phones'][$cnt]['status'])) {
								if (is_array($messages[$main_entity_type][$main_entity_id][$contact_id]) &&
									isset($messages[$main_entity_type][$main_entity_id][$contact_id]['note_text'])
								) {
									$note_text = $messages[$main_entity_type][$main_entity_id][$contact_id]['note_text'];
								} else {
									$note_text = $messages[$main_entity_type][$main_entity_id][$contact_id];
								}

								$text = json_encode([
									'TEXT'  => $note_text,
									'PHONE' => $number
								]);
								$note_type = 103;
							} else {
								$text = 'Ошибка отправки на номер ' . $number . '. Статус сообщения: ' . $response['phones'][$cnt]['status'] . ', код ошибки: ' . $response['phones'][$cnt]['error'];
								$note_type = 4;
							}
							$note = [
								'element_id' => $main_entity_id,
								'element_type' => $main_entity_type,
								'note_type' => $note_type,
								'text' => $text,
							];
							if ($automatic) {
								$note['created_user_id'] = self::AMO_USER_ROBOT;
							}
							$notes['add'][] = $note;
						}
					}
				}
			}

			$this->notes->set($notes);
		}
	}

	/**
	 * @param $sms
	 *
	 * @return mixed
	 */
	private
	function smscru_api_send($sms) {
		$i = 0;
		$url = $_url = 'https://smsc.ru/sys/send.php';

		do {
			if ($i++)
				$url = str_replace('://smsc.ru/', '://www' . $i . '.smsc.ru/', $_url);

			$ch = curl_init($url);
			curl_setopt($ch, CURLOPT_POST, 1);
			curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
			curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 60);
			curl_setopt($ch, CURLOPT_TIMEOUT, 60);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $sms);

			$response = curl_exec($ch);
		} while ($response == '' && $i < 5);

		curl_close($ch);

		return $response;
	}

	/**
	 * Формирование массива/текста и добавление заметки в карточку покупателя
	 *
	 * @param $entity_id
	 * @param $element_type
	 * @param $message
	 * @param int $response_code
	 */
	private
	function entity_notes_set($entity_id, $element_type, $message, $response_code = 1) {
		$text = 'Возникла ошибка при отправке сообщения ("' . $message . '"): ' . $this->_errors_cods[$response_code];

		$notes['add'] = [
			[
				'element_id' => $entity_id,
				'element_type' => $element_type,
				'note_type' => 4,
				'text' => $text,
				'created_user_id' => self::AMO_USER_ROBOT,
			],
		];
		$this->notes->set($notes);
	}

	/**
	 * Поиск связанной компании
	 * Вызывается в нескольких местах. Проверка is_null - чтобы не делать лишние запросы в апи
	 * в случае, если в шаблоне присутствуют и макрос {{company_name}} и другие макросы компаний
	 * @return array
	 */
	private
	function find_linked_company() {
		if (is_null($this->_linked_company)) {
			$linked_companies = [];

			foreach ($this->_entity as $numeric_type => $entities) {
				//если мы отправляем сообщение с фронта - возможно, основная сущность и есть контакт
				if ($numeric_type === self::AMO_COMPANIES_TYPE) {
					foreach ($entities as $entity) {
						$linked_companies[$numeric_type][$entity['id']][$entity['id']] = $entity['data'];
						//функционал завязан на linked_entity_id - в случае контакта, это и есть его id
					}
					continue;
				}
				$ids = [];
				foreach ($entities as $entity) {
					$ids[] = $entity['id'];
				}

				$filter['links'] = [
					[
						'from' => $this->_entity_types[$numeric_type],
						'from_id' => $ids,
						'to' => 'companies',
					]
				];
				$links = $this->amo_api->send_api_request('links', $filter);
				$companies_ids = [];
				if (is_array($links)) {
					foreach ($links as $link) {
						if (!empty($link['to_id']) && !empty($link['from_id'])) {
							$companies_ids[] = $link['to_id'];
							//чтобы примешать к контакту айди основной сущности (кейс в списках)
							$entity_links[$link['to_id']] = $link['from_id'];
						}
					}

					if (!empty($companies_ids)) {
						$companies = $this->company->get(['id' => $companies_ids]);
						//сохраняем контакты в массив, где ключ - id контакта
						if (is_array($companies)) {
							foreach ($companies as $company) {
								$linked_companies[$numeric_type][(int)$entity_links[$company['id']]] = $company;
							}
						}
					}
				}
			}
			$this->_linked_company = !empty($linked_companies) ? $linked_companies : [];
		}

		return $this->_linked_company;
	}

	/**
	 * Возвращает массив контактов
	 *
	 * @return array
	 */
	private
	function find_contacts() {
		if (is_null($this->_contacts)) {
			$linked_contacts = [];
			foreach ($this->_entity as $numeric_type => $entities) {
				//если мы отправляем сообщение с фронта - возможно, основная сущность и есть контакт
				if ($numeric_type === self::AMO_CONTACTS_TYPE) {
					foreach ($entities as $entity) {
						$linked_contacts[$numeric_type][$entity['id']][$entity['id']] = $entity['data'];
						//функционал завязан на linked_entity_id - в случае контакта, это и есть его id
					}
					continue;
				}

				//вхождение в первый блок возможно только из дп
				if (!empty($this->_params['settings']['only_main']) && (int)$this->_params['settings']['only_main'] === 1) {
					//В настройке дп виджета указанно отправлять только главному контакту
					foreach ($entities as $main_entity_id => $entity) {
						if (!empty($entity['data']['main_contact_id'])) {
							$id = $entity['data']['main_contact_id'];
							$contacts = $this->contacts->get(['id' => $id]);
							$contact = reset($contacts);
							$linked_contacts[$numeric_type][$main_entity_id][$contact['id']] = $contact;
						}
					}
				} else {
					//отправлять всем контактам
					$ids = [];
					foreach ($entities as $entity) {
						$ids[] = $entity['id'];
					}
					$filter['links'] = [
						[
							'from' => $this->_entity_types[$numeric_type],
							'from_id' => $ids,
							'to' => 'contacts',
						]
					];
					$links = $this->amo_api->send_api_request('links', $filter);

					foreach ($links as $link) {
						$contact_ids[] = $link['to_id'];
						//чтобы примешать к контакту айди основной сущности (кейс в списках)
						$entity_links[$link['to_id']] = $link['from_id'];
					}
					if (!empty($contact_ids)) {
						$contacts = $this->contacts->get(['id' => $contact_ids]);
						//сохраняем контакты в массив, где ключ - id контакта
						foreach ($contacts as $contact) {
							$linked_contacts[$numeric_type][(int)$entity_links[$contact['id']]][$contact['id']] = $contact;
						}
					}
				}
			}

			$this->_contacts = $linked_contacts;
		}

		return $this->_contacts;
	}

	/**
	 * Для использования find_and_replace_new_marker запросами с фронта
	 * @param int $entity_type
	 * @param int $entity_id
	 * @param int $numeric_type
	 *
	 * @return array
	 */

	private
	function get_lead_or_customer($entity_type, $entity_id, $numeric_type) {
		return $this->_entity[$entity_type][$entity_id]['numeric_type'] === $numeric_type
			? $this->_entity[$entity_type][$entity_id]['data'] : [];
	}
}
